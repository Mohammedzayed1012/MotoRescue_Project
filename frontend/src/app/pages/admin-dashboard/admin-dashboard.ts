import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { DashboardShell, NavItem } from '../../shared/dashboard-shell/dashboard-shell';
import { Icon, IconName } from '../../shared/icon/icon';

type AdminTab = 'overview' | 'requests' | 'mechanics' | 'settings';
type RequestFilter = 'all' | 'searching' | 'in_progress' | 'completed' | 'cancelled';
type RequestStatus = Exclude<RequestFilter, 'all'>;

interface AdminRequest {
  id: string;
  rider: string;
  city: string;
  service: string;
  mechanic: string;
  status: RequestStatus;
  label: string;
  amount: string;
  age: string;
}

interface AdminMechanic {
  id: string;
  name: string;
  initials: string;
  city: string;
  zone: string;
  jobs: number;
  rating: number;
  status: 'Verified' | 'Pending' | 'Review';
  joined: string;
  tone: 'brand' | 'green' | 'blue';
}

interface SettingItem {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: IconName;
}

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

  readonly activeTab = signal<AdminTab>('overview');
  readonly requestFilter = signal<RequestFilter>('all');
  readonly requestQuery = signal('');

  readonly navItems: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'requests', label: 'Rescue requests', icon: 'route', badge: '24' },
    { key: 'mechanics', label: 'Mechanics', icon: 'users' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ];

  readonly pageTitle = computed(() => {
    switch (this.activeTab()) {
      case 'requests':
        return 'Rescue requests';
      case 'mechanics':
        return 'Mechanic network';
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
      case 'settings':
        return 'Dispatch rules, notifications, and safety controls.';
      default:
        return 'A live view of rescues, mechanics, and service health.';
    }
  });

  readonly kpis = [
    {
      label: 'Active requests',
      value: '24',
      hint: '6 awaiting assignment',
      icon: 'activity' as IconName,
      tone: 'brand',
    },
    {
      label: 'Mechanics online',
      value: '38',
      hint: 'of 52 active partners',
      icon: 'users' as IconName,
      tone: 'green',
    },
    {
      label: 'Avg response',
      value: '16 min',
      hint: 'Target under 20 min',
      icon: 'timer' as IconName,
      tone: 'amber',
    },
    {
      label: 'Revenue today',
      value: '₹42,300',
      hint: '+12% vs last Tuesday',
      icon: 'wallet' as IconName,
      tone: 'blue',
    },
  ];

  readonly chart = [
    { day: 'Mon', value: 46, count: 38 },
    { day: 'Tue', value: 62, count: 52 },
    { day: 'Wed', value: 54, count: 45 },
    { day: 'Thu', value: 71, count: 59 },
    { day: 'Fri', value: 84, count: 70 },
    { day: 'Sat', value: 100, count: 83 },
    { day: 'Sun', value: 68, count: 56 },
  ];

  readonly requests = signal<AdminRequest[]>([
    {
      id: 'MR-2493',
      rider: 'Sneha Patil',
      city: 'Bengaluru',
      service: 'Battery jump-start',
      mechanic: 'Awaiting assignment',
      status: 'searching',
      label: 'Searching',
      amount: '₹320',
      age: '2 min',
    },
    {
      id: 'MR-2490',
      rider: 'Vikram Shah',
      city: 'Mumbai',
      service: 'Towing & recovery',
      mechanic: 'Awaiting assignment',
      status: 'searching',
      label: 'Searching',
      amount: '₹499',
      age: '6 min',
    },
    {
      id: 'MR-2488',
      rider: 'Meera Joshi',
      city: 'Pune',
      service: 'Puncture repair',
      mechanic: 'Imran Shaikh',
      status: 'in_progress',
      label: 'In progress',
      amount: '₹278',
      age: '14 min',
    },
    {
      id: 'MR-2485',
      rider: 'Rahul Verma',
      city: 'Hyderabad',
      service: 'Chain adjustment',
      mechanic: 'Deepak Rao',
      status: 'in_progress',
      label: 'In progress',
      amount: '₹229',
      age: '28 min',
    },
    {
      id: 'MR-2481',
      rider: 'Aarav Mehta',
      city: 'Bengaluru',
      service: 'Puncture repair',
      mechanic: 'Ravi Kumar',
      status: 'completed',
      label: 'Completed',
      amount: '₹278',
      age: '42 min',
    },
    {
      id: 'MR-2479',
      rider: 'Nisha Kulkarni',
      city: 'Chennai',
      service: 'Fuel delivery',
      mechanic: '—',
      status: 'cancelled',
      label: 'Cancelled',
      amount: '₹0',
      age: '1 h',
    },
    {
      id: 'MR-2476',
      rider: 'Aditya Rao',
      city: 'Delhi NCR',
      service: 'Battery jump-start',
      mechanic: 'Meena Iyer',
      status: 'completed',
      label: 'Completed',
      amount: '₹249',
      age: '1 h',
    },
  ]);

  readonly mechanics = signal<AdminMechanic[]>([
    {
      id: 'mech-1',
      name: 'Ravi Kumar',
      initials: 'RK',
      city: 'Bengaluru',
      zone: 'Whitefield',
      jobs: 1284,
      rating: 4.9,
      status: 'Verified',
      joined: 'Jan 2026',
      tone: 'green',
    },
    {
      id: 'mech-2',
      name: 'Imran Shaikh',
      initials: 'IS',
      city: 'Pune',
      zone: 'Koregaon Park',
      jobs: 942,
      rating: 4.8,
      status: 'Verified',
      joined: 'Feb 2026',
      tone: 'blue',
    },
    {
      id: 'mech-3',
      name: 'Deepak Rao',
      initials: 'DR',
      city: 'Hyderabad',
      zone: 'Gachibowli',
      jobs: 611,
      rating: 4.7,
      status: 'Pending',
      joined: 'Jun 2026',
      tone: 'brand',
    },
    {
      id: 'mech-4',
      name: 'Arjun Das',
      initials: 'AD',
      city: 'Bengaluru',
      zone: 'Koramangala',
      jobs: 0,
      rating: 0,
      status: 'Review',
      joined: 'Nov 2026',
      tone: 'brand',
    },
    {
      id: 'mech-5',
      name: 'Meena Iyer',
      initials: 'MI',
      city: 'Chennai',
      zone: 'Adyar',
      jobs: 388,
      rating: 4.9,
      status: 'Verified',
      joined: 'Mar 2026',
      tone: 'green',
    },
    {
      id: 'mech-6',
      name: 'Farhan Ali',
      initials: 'FA',
      city: 'Hyderabad',
      zone: 'Banjara Hills',
      jobs: 204,
      rating: 4.5,
      status: 'Pending',
      joined: 'Sep 2026',
      tone: 'blue',
    },
  ]);

  readonly activity = [
    {
      icon: 'check' as IconName,
      text: 'Ravi Kumar accepted request #MR-2493',
      time: '2 min ago',
      tone: 'green',
    },
    {
      icon: 'wallet' as IconName,
      text: 'Payout batch PO-8841 initiated — ₹3,420',
      time: '18 min ago',
      tone: 'blue',
    },
    {
      icon: 'user' as IconName,
      text: 'New mechanic application from Arjun Das',
      time: '34 min ago',
      tone: 'brand',
    },
    {
      icon: 'check' as IconName,
      text: 'Request #MR-2477 completed in 22 min',
      time: '1 h ago',
      tone: 'green',
    },
    {
      icon: 'alert' as IconName,
      text: 'Heavy rain alert active in Mumbai zone',
      time: '1 h ago',
      tone: 'amber',
    },
  ];

  readonly settings = signal<SettingItem[]>([
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
  ]);

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
        [request.id, request.rider, request.city, request.service, request.mechanic].some(
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

  setTab(tab: string): void {
    this.activeTab.set(tab as AdminTab);
  }

  setFilter(filter: RequestFilter): void {
    this.requestFilter.set(filter);
  }

  assign(request: AdminRequest): void {
    this.requests.update((requests) =>
      requests.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: 'in_progress' as RequestStatus,
              label: 'In progress',
              mechanic: 'Nearest available partner',
            }
          : item,
      ),
    );
    this.toasts.show(`Request ${request.id} assigned to the nearest partner.`, 'success');
  }

  complete(request: AdminRequest): void {
    this.requests.update((requests) =>
      requests.map((item) =>
        item.id === request.id
          ? { ...item, status: 'completed' as RequestStatus, label: 'Completed' }
          : item,
      ),
    );
    this.toasts.show(`Request ${request.id} marked as completed.`, 'success');
  }

  approve(mechanic: AdminMechanic): void {
    this.mechanics.update((mechanics) =>
      mechanics.map((item) =>
        item.id === mechanic.id ? { ...item, status: 'Verified' as const } : item,
      ),
    );
    this.toasts.show(`${mechanic.name} is now a verified partner.`, 'success');
  }

  toggleSetting(key: string): void {
    this.settings.update((items) =>
      items.map((item) => (item.key === key ? { ...item, enabled: !item.enabled } : item)),
    );

    const setting = this.settings().find((item) => item.key === key);
    if (setting) {
      this.toasts.show(
        `${setting.title} ${setting.enabled ? 'enabled' : 'disabled'}.`,
        setting.enabled ? 'success' : 'info',
      );
    }
  }

  exportRequests(): void {
    const header = ['Reference', 'Rider', 'City', 'Service', 'Mechanic', 'Status', 'Amount', 'Age'];
    const rows = this.requests().map((request) => [
      request.id,
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
    this.toasts.show('Platform settings saved.', 'success');
  }
}
