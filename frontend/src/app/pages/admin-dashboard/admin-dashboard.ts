import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ApiRescueRequest, ApiUser, PlatformStats, SupportMessage, SupportThread } from '../../core/models';
import { DashboardShell, NavItem } from '../../shared/dashboard-shell/dashboard-shell';
import { Icon, IconName } from '../../shared/icon/icon';

type AdminTab = 'overview' | 'requests' | 'mechanics' | 'support' | 'settings';
type RequestFilter = 'all' | 'searching' | 'in_progress' | 'completed' | 'cancelled';
type RequestStatus = Exclude<RequestFilter, 'all'>;

interface AdminRequest {
  id: number;
  reference: string;
  rider: string;
  city: string;
  service: string;
  mechanic: string;
  mechanicId?: number;
  status: RequestStatus;
  label: string;
  amount: string;
  age: string;
}

interface AdminMechanic {
  id: number;
  name: string;
  initials: string;
  city: string;
  zone: string;
  jobs: number;
  rating: number;
  online: boolean;
  status: 'Verified' | 'Pending';
  joined: string;
}

interface ActivityItem {
  icon: IconName;
  text: string;
  time: string;
  tone: 'green' | 'blue' | 'amber' | 'brand';
}

interface SettingItem {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: IconName;
}

const SETTINGS_KEY = 'motorescue.admin.settings';

@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardShell, Icon],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard {
  readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<AdminTab>('overview');
  readonly requestFilter = signal<RequestFilter>('all');
  readonly requestQuery = signal('');
  readonly loading = signal(true);

  readonly users = signal<ApiUser[]>([]);
  readonly requests = signal<AdminRequest[]>([]);
  readonly stats = signal<PlatformStats | null>(null);

  /* Rescue desk chat -------------------------------------------------- */
  readonly supportThreads = signal<SupportThread[]>([]);
  readonly activeThread = signal<SupportThread | null>(null);
  readonly threadMessages = signal<SupportMessage[]>([]);
  readonly replyText = signal('');
  readonly sendingReply = signal(false);
  readonly loadingMessages = signal(false);

  readonly supportUnread = computed(() =>
    this.supportThreads().reduce((total, thread) => total + (thread.adminUnread ?? 0), 0),
  );

  readonly navItems = computed<NavItem[]>(() => {
    const active = this.stats()?.activeRequests ?? 0;
    return [
      { key: 'overview', label: 'Overview', icon: 'grid' },
      {
        key: 'requests',
        label: 'Rescue requests',
        icon: 'route',
        badge: active > 0 ? String(active) : undefined,
      },
      { key: 'mechanics', label: 'Mechanics', icon: 'users' },
      {
        key: 'support',
        label: 'Support inbox',
        icon: 'headset',
        badge: this.supportUnread() > 0 ? String(this.supportUnread()) : undefined,
      },
      { key: 'settings', label: 'Settings', icon: 'settings' },
    ];
  });

  readonly pageTitle = computed(() => {
    switch (this.activeTab()) {
      case 'requests':
        return 'Rescue requests';
      case 'mechanics':
        return 'Mechanic network';
      case 'support':
        return 'Rescue desk inbox';
      case 'settings':
        return 'Platform settings';
      default:
        return 'Operations overview';
    }
  });

  readonly pageSubtitle = computed(() => {
    switch (this.activeTab()) {
      case 'requests':
        return 'Every live and completed request across all service zones.';
      case 'mechanics':
        return 'Verify partners, review performance, and manage coverage.';
      case 'support':
        return 'Every rider conversation, with the issue and request behind it.';
      case 'settings':
        return 'Dispatch preferences for this operations console.';
      default:
        return 'A live view of rescues, mechanics, and rider activity.';
    }
  });

  readonly kpis = computed(() => {
    const stats = this.stats();
    return [
      {
        label: 'Active requests',
        value: String(stats?.activeRequests ?? 0),
        hint: `${stats?.searching ?? 0} awaiting assignment`,
        icon: 'activity' as IconName,
        tone: 'brand',
      },
      {
        label: 'Mechanics online',
        value: String(stats?.mechanicsOnline ?? 0),
        hint: `of ${stats?.mechanicsTotal ?? 0} partners`,
        icon: 'users' as IconName,
        tone: 'green',
      },
      {
        label: 'Avg response',
        value: `${stats?.avgResponseMinutes ?? 0} min`,
        hint: 'From request to accept',
        icon: 'timer' as IconName,
        tone: 'amber',
      },
      {
        label: 'Revenue today',
        value: `₹${stats?.revenueToday ?? 0}`,
        hint: `${stats?.completedToday ?? 0} completed today`,
        icon: 'wallet' as IconName,
        tone: 'blue',
      },
    ];
  });

  readonly chart = computed(() => {
    const weekly = this.stats()?.weekly ?? [];
    if (weekly.length) {
      return weekly.map((point, index) => ({ ...point, today: index === weekly.length - 1 }));
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
      day,
      count: 0,
      value: 6,
      today: false,
    }));
  });

  readonly weekTotal = computed(() =>
    (this.stats()?.weekly ?? []).reduce((total, point) => total + point.count, 0),
  );

  readonly mechanics = computed<AdminMechanic[]>(() =>
    this.users()
      .filter((user) => user.role === 'MECHANIC')
      .map((user) => ({
        id: user.id,
        name: user.fullName,
        initials: this.initials(user.fullName),
        city: user.city ?? '—',
        zone: user.workshop ?? user.specialty ?? 'Unassigned',
        jobs: user.totalJobs,
        rating: user.rating,
        online: user.online,
        status: user.verified ? 'Verified' : 'Pending',
        joined: this.formatMonth(user.createdAt),
      })),
  );

  readonly ridersCount = computed(
    () => this.users().filter((user) => user.role === 'CUSTOMER').length,
  );

  readonly onlineMechanics = computed(
    () => this.mechanics().filter((mechanic) => mechanic.online).length,
  );

  readonly networkRating = computed(() => {
    const rated = this.mechanics().filter((mechanic) => mechanic.rating > 0);
    if (!rated.length) return '—';
    const average = rated.reduce((total, mechanic) => total + mechanic.rating, 0) / rated.length;
    return average.toFixed(1);
  });

  readonly activity = computed<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    const recent = this.requests().slice(0, 5);

    for (const request of recent) {
      if (request.status === 'searching') {
        items.push({
          icon: 'alert',
          text: `${request.rider} requested ${request.service.toLowerCase()}`,
          time: request.age,
          tone: 'amber',
        });
      } else if (request.status === 'in_progress') {
        items.push({
          icon: 'navigation',
          text: `${request.mechanic} is handling ${request.reference} for ${request.rider}`,
          time: request.age,
          tone: 'blue',
        });
      } else if (request.status === 'completed') {
        items.push({
          icon: 'check',
          text: `${request.reference} completed for ${request.rider} · ${request.amount}`,
          time: request.age,
          tone: 'green',
        });
      } else {
        items.push({
          icon: 'close',
          text: `${request.reference} cancelled by ${request.rider}`,
          time: request.age,
          tone: 'brand',
        });
      }
    }

    return items;
  });

  readonly settings = signal<SettingItem[]>(this.loadSettings());

  readonly filters: { key: RequestFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'searching', label: 'Searching' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  readonly pendingMechanics = computed(() =>
    this.mechanics().filter((mechanic) => mechanic.status !== 'Verified'),
  );

  readonly filteredRequests = computed(() => {
    const query = this.requestQuery().trim().toLowerCase();
    const filter = this.requestFilter();

    return this.requests().filter((request) => {
      const matchesFilter = filter === 'all' || request.status === filter;
      const matchesQuery =
        !query ||
        [request.reference, request.rider, request.city, request.service, request.mechanic].some(
          (value) => value.toLowerCase().includes(query),
        );
      return matchesFilter && matchesQuery;
    });
  });

  readonly liveRequests = computed(() =>
    this.requests()
      .filter((request) => request.status === 'searching' || request.status === 'in_progress')
      .slice(0, 5),
  );

  constructor() {
    this.loadAll();

    interval(4000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadAll();
        this.refreshThreadMessages();
      });
  }

  setTab(tab: string): void {
    this.activeTab.set(tab as AdminTab);

    if (tab === 'support' && !this.activeThread()) {
      const first = this.supportThreads()[0];
      if (first) {
        this.openThread(first);
      }
    }
  }

  setFilter(filter: RequestFilter): void {
    this.requestFilter.set(filter);
  }

  assign(request: AdminRequest): void {
    this.api.assignRequest(request.id).subscribe({
      next: (updated) => {
        this.toasts.show(
          `${request.reference} assigned to ${updated.mechanicName ?? 'the nearest partner'}.`,
          'success',
        );
        this.loadAll();
      },
      error: (error: unknown) => {
        this.toasts.show(this.errorMessage(error, 'Could not assign this request.'), 'error');
        this.loadAll();
      },
    });
  }

  complete(request: AdminRequest): void {
    if (!request.mechanicId) {
      this.toasts.show('Assign a mechanic before completing this request.', 'error');
      return;
    }

    this.api.completeRequest(request.id, request.mechanicId).subscribe({
      next: () => {
        this.toasts.show(`${request.reference} marked as completed.`, 'success');
        this.loadAll();
      },
      error: (error: unknown) => {
        this.toasts.show(this.errorMessage(error, 'Could not complete this request.'), 'error');
        this.loadAll();
      },
    });
  }

  approve(mechanic: AdminMechanic): void {
    this.api.setVerified(mechanic.id, true).subscribe({
      next: () => {
        this.toasts.show(`${mechanic.name} is now a verified partner.`, 'success');
        this.loadAll();
      },
      error: (error: unknown) => {
        this.toasts.show(this.errorMessage(error, 'Could not verify this partner.'), 'error');
      },
    });
  }

  toggleSetting(key: string): void {
    this.settings.update((items) =>
      items.map((item) => (item.key === key ? { ...item, enabled: !item.enabled } : item)),
    );
    this.persistSettings();

    const setting = this.settings().find((item) => item.key === key);
    if (setting) {
      this.toasts.show(
        `${setting.title} ${setting.enabled ? 'enabled' : 'disabled'}.`,
        setting.enabled ? 'success' : 'info',
      );
    }
  }

  exportRequests(): void {
    const header = [
      'Reference',
      'Rider',
      'City',
      'Service',
      'Mechanic',
      'Status',
      'Amount',
      'Age',
    ];
    const rows = this.requests().map((request) => [
      request.reference,
      request.rider,
      request.city,
      request.service,
      request.mechanic,
      request.label,
      request.amount,
      request.age,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'motorescue-requests.csv';
    link.click();
    URL.revokeObjectURL(url);

    this.toasts.show('Requests exported as a CSV file.', 'success');
  }

  saveSettings(): void {
    this.persistSettings();
    this.toasts.show('Operations preferences saved on this device.', 'success');
  }

  private loadAll(): void {
    this.api.stats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => this.stats.set(null),
    });

    this.api.allRequests().subscribe({
      next: (requests) => {
        this.requests.set(requests.map((request) => this.toAdminRequest(request)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.api.users().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.users.set([]),
    });

    this.api.supportThreads().subscribe({
      next: (threads) => {
        this.supportThreads.set(threads);

        const active = this.activeThread();
        if (active) {
          const fresh = threads.find((thread) => thread.id === active.id);
          if (fresh) {
            this.activeThread.set(fresh);
          }
        }
      },
      error: () => this.supportThreads.set([]),
    });
  }

  /* Rescue desk chat -------------------------------------------------- */

  openThread(thread: SupportThread): void {
    this.activeThread.set(thread);
    this.loadThreadMessages(thread.id);

    this.api.markSupportRead(thread.id, 'ADMIN').subscribe({
      next: (updated) => this.replaceThread(updated),
      error: () => undefined,
    });
  }

  sendReply(): void {
    const thread = this.activeThread();
    const body = this.replyText().trim();

    if (!thread || !body || this.sendingReply()) {
      return;
    }

    this.sendingReply.set(true);
    this.api
      .sendSupportMessage(thread.id, {
        senderRole: 'ADMIN',
        senderName: this.auth.user()?.fullName,
        body,
      })
      .subscribe({
        next: () => {
          this.sendingReply.set(false);
          this.replyText.set('');
          this.loadThreadMessages(thread.id);
        },
        error: () => {
          this.sendingReply.set(false);
          this.toasts.show('Reply could not be sent. Try again.', 'error');
        },
      });
  }

  onReplyInput(event: Event): void {
    this.replyText.set((event.target as HTMLTextAreaElement).value);
  }

  private loadThreadMessages(threadId: number): void {
    this.loadingMessages.set(true);
    this.api.supportMessages(threadId).subscribe({
      next: (messages) => {
        this.threadMessages.set(messages);
        this.loadingMessages.set(false);
      },
      error: () => {
        this.threadMessages.set([]);
        this.loadingMessages.set(false);
      },
    });
  }

  private refreshThreadMessages(): void {
    const thread = this.activeThread();
    if (!thread) return;

    this.api.supportMessages(thread.id).subscribe({
      next: (messages) => {
        const grew = messages.length > this.threadMessages().length;
        this.threadMessages.set(messages);

        if (grew) {
          this.api.markSupportRead(thread.id, 'ADMIN').subscribe({
            next: (updated) => this.replaceThread(updated),
            error: () => undefined,
          });
        }
      },
      error: () => undefined,
    });
  }

  private replaceThread(updated: SupportThread): void {
    this.supportThreads.update((threads) =>
      threads.map((thread) => (thread.id === updated.id ? updated : thread)),
    );

    if (this.activeThread()?.id === updated.id) {
      this.activeThread.set(updated);
    }
  }

  timeOf(value?: string): string {
    if (!value) return '';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  initialsOf(name?: string): string {
    return (name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  private toAdminRequest(request: ApiRescueRequest): AdminRequest {
    const status: RequestStatus =
      request.status === 'SEARCHING'
        ? 'searching'
        : request.status === 'COMPLETED'
          ? 'completed'
          : request.status === 'CANCELLED'
            ? 'cancelled'
            : 'in_progress';

    const label =
      status === 'searching'
        ? 'Searching'
        : status === 'in_progress'
          ? request.status === 'ARRIVED'
            ? 'Arrived'
            : 'In progress'
          : status === 'completed'
            ? 'Completed'
            : 'Cancelled';

    return {
      id: request.id,
      reference: request.reference,
      rider: request.riderName ?? 'Rider',
      city: request.location ?? '—',
      service: request.serviceLabel ?? 'Roadside assistance',
      mechanic: request.mechanicName ?? 'Awaiting assignment',
      mechanicId: request.mechanicId,
      status,
      label,
      amount: request.quote ?? '—',
      age: this.age(request.createdAt),
    };
  }

  private initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  private formatMonth(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(date);
  }

  private age(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} d`;
  }

  private errorMessage(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: string } })?.error?.message;
    return typeof message === 'string' && message ? message : fallback;
  }

  private loadSettings(): SettingItem[] {
    const defaults: SettingItem[] = [
      {
        key: 'autoDispatch',
        title: 'Automatic dispatch',
        description: 'Offer new requests to the three closest available mechanics.',
        enabled: true,
        icon: 'navigation',
      },
      {
        key: 'escalation',
        title: 'SLA escalation',
        description: 'Alert the rescue desk when a request is unassigned for 3 minutes.',
        enabled: true,
        icon: 'alert',
      },
      {
        key: 'emailDigest',
        title: 'Daily email digest',
        description: 'Send operations metrics and incident notes to admins at 8pm.',
        enabled: false,
        icon: 'mail',
      },
      {
        key: 'maintenance',
        title: 'Maintenance mode',
        description: 'Pause new requests while keeping live rescues running.',
        enabled: false,
        icon: 'lock',
      },
    ];

    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return defaults;

      const saved = JSON.parse(raw) as Record<string, boolean>;
      return defaults.map((item) => ({
        ...item,
        enabled: typeof saved[item.key] === 'boolean' ? saved[item.key] : item.enabled,
      }));
    } catch {
      return defaults;
    }
  }

  private persistSettings(): void {
    const values: Record<string, boolean> = {};
    for (const item of this.settings()) {
      values[item.key] = item.enabled;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(values));
  }
}
