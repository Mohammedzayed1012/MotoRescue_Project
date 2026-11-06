import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ApiRescueRequest, SupportMessage, SupportThread } from '../../core/models';
import { Icon } from '../../shared/icon/icon';
import { Logo } from '../../shared/logo/logo';

const ACTIVE_STATUSES = ['SEARCHING', 'EN_ROUTE', 'ARRIVED'];

@Component({
  selector: 'app-support-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Icon, Logo],
  templateUrl: './support-chat.html',
  styleUrl: './support-chat.scss',
})
export class SupportChat {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly messagesEl = viewChild<ElementRef<HTMLElement>>('messagesEl');

  readonly thread = signal<SupportThread | null>(null);
  readonly messages = signal<SupportMessage[]>([]);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly escalating = signal(false);
  readonly helpOpen = signal(false);
  readonly context = signal<ApiRescueRequest | null>(null);

  readonly form = this.fb.nonNullable.group({
    body: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  readonly escalated = computed(() => this.thread()?.escalated === true);

  readonly issueLabel = computed(
    () => this.thread()?.issue || this.context()?.serviceLabel || 'General enquiry',
  );

  readonly requestReference = computed(
    () => this.thread()?.requestReference || this.context()?.reference || null,
  );

  readonly requestStatus = computed(
    () => this.thread()?.requestStatus || this.context()?.status || null,
  );

  readonly quickReplies = [
    'When will the mechanic arrive?',
    'What is the price for this rescue?',
    'The mechanic has not arrived yet.',
  ];

  readonly escalationOptions = [
    { label: 'Issue not sorted', icon: 'alert' as const },
    { label: 'Mechanic has not arrived', icon: 'clock' as const },
    { label: 'Price or payment problem', icon: 'wallet' as const },
  ];

  constructor() {
    this.bootstrap();

    interval(4000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());

    // Keep the conversation scrolled to the newest message.
    effect(() => {
      this.messages();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  private bootstrap(): void {
    const riderId = this.auth.user()?.id;
    if (!riderId) {
      this.loading.set(false);
      return;
    }

    this.api
      .riderRequests(riderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (requests) => {
          const active = requests.find((item) => ACTIVE_STATUSES.includes(item.status));
          const latest = active ?? requests[0] ?? null;
          this.context.set(latest);
          this.openThread(riderId);
        },
        error: () => this.openThread(riderId),
      });
  }

  private openThread(riderId: number): void {
    const request = this.context();

    this.api
      .openSupportThread({
        riderId,
        issue: request?.serviceLabel ?? 'General enquiry',
        requestReference: request?.reference,
        requestStatus: request?.status,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (thread) => {
          this.thread.set(thread);
          this.markRead(thread.id);
          this.loadMessages(thread.id, true);
        },
        error: () => {
          this.loading.set(false);
          this.toasts.show('Could not open the rescue desk. Please refresh.', 'error');
        },
      });
  }

  private loadMessages(threadId: number, firstLoad = false): void {
    this.api
      .supportMessages(threadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (messages) => {
          this.messages.set(messages);
          if (firstLoad) {
            this.loading.set(false);
            this.markRead(threadId);
          }
        },
        error: () => {
          if (firstLoad) {
            this.loading.set(false);
          }
        },
      });
  }

  private refresh(): void {
    const thread = this.thread();
    if (!thread) return;

    this.api
      .supportThread(thread.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fresh) => this.thread.set(fresh),
        error: () => undefined,
      });

    this.api
      .supportMessages(thread.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (messages) => {
          const grew = messages.length > this.messages().length;
          this.messages.set(messages);
          if (grew) {
            this.markRead(thread.id);
          }
        },
        error: () => undefined,
      });
  }

  private markRead(threadId: number): void {
    this.api
      .markSupportRead(threadId, 'CUSTOMER')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => undefined, error: () => undefined });
  }

  useQuickReply(text: string): void {
    this.form.controls.body.setValue(text);
    this.form.controls.body.markAsDirty();
  }

  send(): void {
    const thread = this.thread();
    if (!thread || this.sending()) return;

    const body = this.form.controls.body.value.trim();
    if (!body) {
      this.form.controls.body.markAsTouched();
      return;
    }

    this.sending.set(true);
    this.api
      .sendSupportMessage(thread.id, {
        senderRole: 'CUSTOMER',
        senderName: this.auth.user()?.fullName,
        body,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.form.controls.body.setValue('');
          this.loadMessages(thread.id);
          this.refresh();
        },
        error: () => {
          this.sending.set(false);
          this.toasts.show('Message could not be sent. Try again.', 'error');
        },
      });
  }

  escalate(reason: string): void {
    const thread = this.thread();
    if (!thread || this.escalating() || thread.escalated) return;

    this.escalating.set(true);
    this.api
      .escalateSupportThread(thread.id, {
        reason,
        riderName: this.auth.user()?.fullName,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.escalating.set(false);
          this.helpOpen.set(false);
          this.thread.set(updated);
          this.loadMessages(thread.id);
          this.toasts.show('An operations admin has been brought into this chat.', 'success');
        },
        error: () => {
          this.escalating.set(false);
          this.toasts.show('Could not escalate right now. Please try again.', 'error');
        },
      });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  roleInitials(message: SupportMessage): string {
    if (message.senderRole === 'CUSTOMER') return 'ME';
    if (message.senderRole === 'ADMIN') return 'OP';
    return 'AI';
  }

  roleLabel(message: SupportMessage): string {
    if (message.senderRole === 'CUSTOMER') return 'You';
    if (message.senderRole === 'ADMIN') return message.senderName || 'Operations admin';
    return 'Rescue desk assistant · AI';
  }

  timeOf(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    const el = this.messagesEl()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
