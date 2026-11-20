import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

interface ChatReply {
  text: string;
  suggestions: string[];
}

@Component({
  selector: 'app-chat-assistant',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    @if (open()) {
      <section class="chat" role="dialog" aria-label="MotoBot customer support">
        <header class="chat__head">
          <span class="chat__avatar"><app-icon name="sparkles" [size]="18" /></span>
          <div class="chat__who">
            <strong>MotoBot</strong>
            <span class="chat__status"><i></i> Customer support</span>
          </div>
          <button type="button" class="chat__close" (click)="close()" aria-label="Close chat">
            <app-icon name="close" [size]="16" />
          </button>
        </header>

        <div class="chat__log" #log>
          @for (message of messages(); track $index) {
            <div class="msg" [class.msg--me]="message.from === 'user'">
              @if (message.from === 'bot') {
                <span class="msg__avatar"><app-icon name="sparkles" [size]="12" /></span>
              }
              <p>{{ message.text }}</p>
            </div>
          }

          @if (typing()) {
            <div class="msg">
              <span class="msg__avatar"><app-icon name="sparkles" [size]="12" /></span>
              <p class="typing" aria-label="MotoBot is typing"><i></i><i></i><i></i></p>
            </div>
          }

          @if (escalated()) {
            <div class="handoff" role="status">
              <span class="handoff__icon"><app-icon name="headset" [size]="16" /></span>
              <div class="handoff__body">
                <strong>Passed to customer care</strong>
                <p>
                  Our support team has been notified and will speak with you directly.
                  Call <a href="tel:+918000000000">+91 80000 00000</a>.
                </p>
              </div>
            </div>
          }
        </div>

        @if (suggestions().length) {
          <div class="chat__chips">
            @for (suggestion of suggestions(); track suggestion) {
              <button type="button" (click)="send(suggestion)">{{ suggestion }}</button>
            }
          </div>
        }

        <form class="chat__form" (submit)="submit($event)">
          <input
            #input
            type="text"
            name="message"
            autocomplete="off"
            placeholder="Ask about your rescue…"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
            aria-label="Message MotoBot"
          />
          <button
            type="submit"
            class="chat__send"
            [disabled]="!draft().trim() || typing()"
            aria-label="Send message"
          >
            <app-icon name="arrow-right" [size]="17" />
          </button>
        </form>

        <p class="chat__note">
          Need help? Call <a href="tel:+918000000000">+91 80000 00000</a>
        </p>
      </section>
    }

    <button
      type="button"
      class="chat-fab"
      [class.chat-fab--open]="open()"
      (click)="toggle()"
      [attr.aria-label]="open() ? 'Close MotoBot chat' : 'Open MotoBot chat'"
      [attr.aria-expanded]="open()"
    >
      <app-icon [name]="open() ? 'close' : 'message'" [size]="22" />
      @if (!open()) {
        <span class="chat-fab__dot" aria-hidden="true"></span>
      }
    </button>
  `,
  styles: `
    :host {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: 120;
      display: block;
    }

    .chat-fab {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: var(--brand, #f2542d);
      color: #fff;
      box-shadow: 0 14px 30px rgba(242, 84, 45, 0.35);
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }

    .chat-fab:hover {
      transform: translateY(-2px);
      box-shadow: 0 18px 34px rgba(242, 84, 45, 0.42);
    }

    .chat-fab--open {
      background: var(--ink-900, #101a2c);
      box-shadow: 0 14px 30px rgba(16, 26, 44, 0.35);
    }

    .chat-fab__dot {
      position: absolute;
      top: 12px;
      right: 13px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      border: 2px solid #fff;
      background: #22c55e;
    }

    .chat {
      position: absolute;
      right: 0;
      bottom: 72px;
      display: flex;
      flex-direction: column;
      width: min(360px, calc(100vw - 32px));
      max-height: min(70vh, 540px);
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 30px 70px rgba(8, 15, 30, 0.28);
      overflow: hidden;
      animation: chat-in 0.18s ease-out;
    }

    @keyframes chat-in {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.98);
      }
    }

    .chat__head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 14px;
      background: var(--ink-900, #101a2c);
      color: #fff;
    }

    .chat__avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      flex: none;
    }

    .chat__who {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
      line-height: 1.2;
    }

    .chat__who strong {
      font-size: 0.9rem;
      letter-spacing: 0.01em;
    }

    .chat__status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.66rem;
      font-weight: 600;
    }

    .chat__status i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
    }

    .chat__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      cursor: pointer;
      flex: none;
    }

    .chat__close:hover {
      background: rgba(255, 255, 255, 0.22);
    }

    .chat__log {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: var(--slate-50, #f8fafc);
      min-height: 180px;
      scroll-behavior: smooth;
    }

    .msg {
      display: flex;
      align-items: flex-end;
      gap: 7px;
      max-width: 100%;
    }

    .msg--me {
      justify-content: flex-end;
    }

    .msg__avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--brand-soft, #ffeee8);
      color: var(--brand, #f2542d);
      flex: none;
    }

    .msg p {
      max-width: 82%;
      padding: 9px 12px;
      border-radius: 14px 14px 14px 4px;
      background: #fff;
      border: 1px solid var(--slate-200, #e2e8f0);
      color: var(--ink-800, #1f2a3d);
      font-size: 0.8rem;
      line-height: 1.45;
      white-space: pre-line;
    }

    .msg--me p {
      border-radius: 14px 14px 4px 14px;
      background: var(--brand, #f2542d);
      border-color: var(--brand, #f2542d);
      color: #fff;
    }

    .typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 12px;
    }

    .typing i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--slate-400, #94a3b8);
      animation: chat-dot 1.1s ease-in-out infinite;
    }

    .typing i:nth-child(2) {
      animation-delay: 0.15s;
    }

    .typing i:nth-child(3) {
      animation-delay: 0.3s;
    }

    .handoff {
      display: flex;
      gap: 9px;
      padding: 11px 12px;
      border: 1px solid #fcd9a8;
      border-radius: 12px;
      background: #fffaef;
    }

    .handoff__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #fef0d5;
      color: #b45309;
      flex: none;
    }

    .handoff__body {
      min-width: 0;
    }

    .handoff__body strong {
      display: block;
      color: #92400e;
      font-size: 0.76rem;
    }

    .handoff__body p {
      margin: 3px 0 0;
      color: #7c5a24;
      font-size: 0.72rem;
      line-height: 1.45;
    }

    .handoff__body a {
      color: var(--brand, #f2542d);
      font-weight: 800;
      text-decoration: none;
    }

    @keyframes chat-dot {
      0%,
      60%,
      100% {
        opacity: 0.35;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-3px);
      }
    }

    .chat__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 10px 12px;
      border-top: 1px solid var(--slate-200, #e2e8f0);
      background: #fff;
    }

    .chat__chips button {
      padding: 6px 10px;
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: 999px;
      background: #fff;
      color: var(--ink-800, #1f2a3d);
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
    }

    .chat__chips button:hover {
      border-color: var(--brand, #f2542d);
      color: var(--brand, #f2542d);
    }

    .chat__form {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-top: 1px solid var(--slate-200, #e2e8f0);
      background: #fff;
    }

    .chat__form input {
      flex: 1;
      min-width: 0;
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: 999px;
      background: var(--slate-50, #f8fafc);
      color: var(--ink-900, #101a2c);
      font-size: 0.8rem;
      outline: none;
    }

    .chat__form input:focus {
      border-color: var(--brand, #f2542d);
      box-shadow: 0 0 0 3px rgba(242, 84, 45, 0.14);
    }

    .chat__send {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: var(--brand, #f2542d);
      color: #fff;
      cursor: pointer;
      flex: none;
    }

    .chat__send:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .chat__note {
      margin: 0;
      padding: 0 12px 10px;
      background: #fff;
      color: var(--slate-500, #64748b);
      font-size: 0.62rem;
      text-align: center;
    }

    .chat__note a {
      color: var(--brand, #f2542d);
      font-weight: 700;
      text-decoration: none;
    }
  `,
})
export class ChatAssistant {
  private static readonly SPAM_WINDOW = 12;
  private static readonly SPAM_THRESHOLD = 8;
  private static readonly ESCALATION_COOLDOWN = 60_000;

  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly open = signal(false);
  readonly typing = signal(false);
  readonly draft = signal('');
  readonly escalated = signal(false);
  readonly suggestions = signal<string[]>([
    'Service prices',
    'Where is my mechanic?',
    'Payment options',
    'Talk to a human',
  ]);

  readonly messages = signal<ChatMessage[]>([
    {
      from: 'bot',
      text: "Hi! I'm MotoBot from MotoRescue support. Ask me about services, prices, tracking your mechanic, payments, or your account.",
    },
  ]);

  private readonly log = viewChild<ElementRef<HTMLDivElement>>('log');
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  private readonly recentUserTexts: string[] = [];
  private lastEscalationAt = 0;
  private pendingEscalation: { message: string; repeats: number } | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.timers.forEach((timer) => clearTimeout(timer)));
  }

  toggle(): void {
    this.open() ? this.close() : this.openChat();
  }

  openChat(): void {
    this.open.set(true);
    this.scrollSoon();
    const timer = setTimeout(() => this.input()?.nativeElement.focus(), 60);
    this.timers.push(timer);
  }

  close(): void {
    this.open.set(false);
  }

  submit(event: Event): void {
    event.preventDefault();
    this.send(this.draft());
  }

  send(text: string): void {
    const clean = text.trim();
    if (!clean || this.typing()) return;

    this.messages.update((list) => [...list, { from: 'user', text: clean }]);
    this.draft.set('');
    this.suggestions.set([]);

    const { repeats, spam } = this.trackRepeat(clean);

    if (spam) {
      this.pendingEscalation = { message: clean, repeats };
      this.typing.set(true);
      this.scrollSoon();
      const timer = setTimeout(() => this.escalate(), 650);
      this.timers.push(timer);
      return;
    }

    // Already handed off: stop answering the same repeated message.
    if (this.escalated() && repeats >= ChatAssistant.SPAM_THRESHOLD) {
      this.scrollSoon();
      return;
    }

    this.typing.set(true);
    this.scrollSoon();

    const timer = setTimeout(() => {
      const reply = this.replyTo(clean);
      this.typing.set(false);
      this.messages.update((list) => [...list, { from: 'bot', text: reply.text }]);
      this.suggestions.set(reply.suggestions);
      this.scrollSoon();
    }, 650);
    this.timers.push(timer);
  }

  private trackRepeat(text: string): { repeats: number; spam: boolean } {
    const normalised = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    this.recentUserTexts.push(normalised);
    if (this.recentUserTexts.length > ChatAssistant.SPAM_WINDOW) {
      this.recentUserTexts.shift();
    }

    const repeats = normalised
      ? this.recentUserTexts.filter((item) => item === normalised).length
      : 0;
    const now = Date.now();
    const spam =
      repeats >= ChatAssistant.SPAM_THRESHOLD &&
      now - this.lastEscalationAt >= ChatAssistant.ESCALATION_COOLDOWN;

    if (spam) this.lastEscalationAt = now;

    return { repeats, spam };
  }

  private escalate(): void {
    this.typing.set(false);
    this.escalated.set(true);
    this.messages.update((list) => [
      ...list,
      {
        from: 'bot',
        text: "You've sent the same message several times, so I've passed this chat to our customer care team. An advisor will speak with you directly — call +91 80000 00000.",
      },
    ]);
    this.suggestions.set([]);
    this.scrollSoon();

    const rider = this.auth.user();
    const pending = this.pendingEscalation;
    if (rider?.id && pending) {
      this.api
        .escalateSupport({
          riderId: rider.id,
          message: pending.message,
          repeatCount: pending.repeats,
        })
        .subscribe({ error: () => undefined });
    }
  }

  private scrollSoon(): void {
    const timer = setTimeout(() => {
      const element = this.log()?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    }, 50);
    this.timers.push(timer);
  }

  private replyTo(text: string): ChatReply {
    const q = text.toLowerCase();
    const has = (...words: string[]) => words.some((word) => q.includes(word));

    if (has('human', 'agent', 'talk to', 'representative', 'someone', 'call you', 'phone', 'call')) {
      return {
        text: 'You can reach our rescue desk 24/7 on +91 80000 00000, or email support@motorescue.com. Average answer time is under 40 seconds.',
        suggestions: ['Service prices', 'Where is my mechanic?'],
      };
    }

    if (has('accident', 'injur', 'emergency', 'hurt', 'fire', 'police')) {
      return {
        text: 'If anyone is hurt, call 112 first. Then call our rescue desk on +91 80000 00000 — we will prioritise your rescue immediately.',
        suggestions: ['Talk to a human'],
      };
    }

    if (has('tow', 'towing', 'flatbed', 'recovery')) {
      return {
        text: 'Towing & recovery is ₹499 as a fixed quote. A partner brings a flatbed suitable for your bike and takes it to the workshop you choose.',
        suggestions: ['Service prices', 'Where is my mechanic?'],
      };
    }

    if (has('puncture', 'tyre', 'tire', 'flat')) {
      return {
        text: 'Puncture & tyre repair is ₹278. A partner reaches you with tools and a spare tube — most jobs take 20–30 minutes on the spot.',
        suggestions: ['Where is my mechanic?', 'Payment options'],
      };
    }

    if (has('battery', 'start', 'jump', 'dead')) {
      return {
        text: 'Battery & starting help is ₹249. We jump-start on the spot and can replace the battery if needed — the replacement is quoted separately.',
        suggestions: ['Service prices', 'Where is my mechanic?'],
      };
    }

    if (has('fuel', 'petrol', 'diesel', 'empty tank')) {
      return {
        text: 'Fuel delivery is ₹199 plus the cost of the fuel. A partner brings enough to get you to the nearest pump.',
        suggestions: ['Service prices', 'Payment options'],
      };
    }

    if (has('chain', 'clutch', 'sprocket')) {
      return {
        text: 'Chain & clutch service is ₹229. We adjust, lube, or replace the chain on the spot where possible.',
        suggestions: ['Service prices', 'Where is my mechanic?'],
      };
    }

    if (has('repair', 'breakdown', 'broken', 'engine', 'brake', 'not working')) {
      return {
        text: 'General repair starts at ₹329. The partner diagnoses first and confirms the final quote with you before any work begins.',
        suggestions: ['Service prices', 'Where is my mechanic?'],
      };
    }

    if (has('price', 'cost', 'charge', 'how much', 'quote', 'fee', 'rate')) {
      return {
        text: 'Fixed prices: puncture ₹278 · battery ₹249 · fuel ₹199 + fuel · general repair ₹329 · chain ₹229 · towing ₹499. You see the quote before confirming — no surge pricing.',
        suggestions: ['Where is my mechanic?', 'Payment options'],
      };
    }

    if (has('where', 'track', 'status', 'coming', 'eta', 'how long', 'reach', 'arrive') || /\blate\b/.test(q)) {
      return {
        text: "Open Overview and check the live map — it shows your mechanic on the roads with the remaining route, plus the live ETA. Tap the map to enlarge it. If the ETA looks wrong, call the rescue desk on +91 80000 00000.",
        suggestions: ['How do I cancel?', 'Talk to a human'],
      };
    }

    if (has('cancel', 'cancelled', 'refund')) {
      return {
        text: 'You can cancel free of charge while we are still finding a mechanic. If a partner is already on the way, call the rescue desk on +91 80000 00000 and we will help.',
        suggestions: ['Talk to a human', 'Payment options'],
      };
    }

    if (has('pay', 'payment', 'upi', 'cash', 'card', 'bill', 'receipt', 'invoice')) {
      return {
        text: 'Pay after the job is done — UPI, debit/credit card, or cash. Your receipt and rating appear in Rescue history.',
        suggestions: ['Review my last rescue', 'Talk to a human'],
      };
    }

    if (has('review', 'rate', 'rating', 'feedback', 'star')) {
      return {
        text: 'After a rescue completes you are asked to rate the service and your mechanic. You can also rate older jobs any time with “Rate now” in Rescue history.',
        suggestions: ['Service prices', 'Talk to a human'],
      };
    }

    if (has('warranty', 'guarantee', 'again', 'not fixed', 'come back')) {
      return {
        text: 'Every job includes a 30-day workmanship guarantee. If the fix does not hold, contact the rescue desk and we will send a partner back at no extra cost.',
        suggestions: ['Talk to a human'],
      };
    }

    if (has('account', 'login', 'log in', 'email', 'password', 'profile', 'phone number')) {
      return {
        text: 'Your name, phone, and bikes can be updated in Account settings. To change your email or if you cannot sign in, contact the rescue desk on +91 80000 00000.',
        suggestions: ['Talk to a human'],
      };
    }

    if (has('bike', 'garage', 'add bike', 'registration', 'number plate')) {
      return {
        text: 'Add your bike under My bikes. Saved make, model, and registration let us match the right partner and tools faster.',
        suggestions: ['Service prices', 'Where is my mechanic?'],
      };
    }

    if (/\b(hi|hello|hey|namaste)\b/.test(q)) {
      return {
        text: "Hello! I'm MotoBot. I can help with service prices, tracking your mechanic, payments, cancellations, reviews, or your account.",
        suggestions: ['Service prices', 'Where is my mechanic?', 'Talk to a human'],
      };
    }

    if (has('thank', 'thanks', 'cheers')) {
      return {
        text: 'Anytime! Ride safe, and ping me if anything else comes up.',
        suggestions: ['Service prices', 'Talk to a human'],
      };
    }

    return {
      text: 'I am not sure about that one. I can help with services, prices, tracking, payments, cancellations, reviews, or account questions. For anything else, call the rescue desk on +91 80000 00000.',
      suggestions: ['Service prices', 'Where is my mechanic?', 'Talk to a human'],
    };
  }
}
