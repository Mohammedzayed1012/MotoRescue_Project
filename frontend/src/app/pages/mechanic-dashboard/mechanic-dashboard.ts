import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { DashboardShell, NavItem } from '../../shared/dashboard-shell/dashboard-shell';
import { Icon, IconName } from '../../shared/icon/icon';

type MechanicTab = 'overview' | 'earnings' | 'profile';
type JobStatus = 'accepted' | 'en_route' | 'arrived';

interface Job {
  id: string;
  customer: string;
  initials: string;
  service: string;
  icon: IconName;
  vehicle: string;
  distance: string;
  payout: number;
  eta: string;
  note: string;
  status: JobStatus;
}

@Component({
  selector: 'app-mechanic-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DashboardShell, Icon],
  templateUrl: './mechanic-dashboard.html',
  styleUrl: './mechanic-dashboard.scss',
})
export class MechanicDashboard {
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);

  readonly activeTab = signal<MechanicTab>('overview');
  readonly online = signal(true);
  readonly incoming = signal<Job | null>(null);
  readonly active = signal<Job | null>(null);
  readonly queue = signal<Job[]>([]);
  readonly earningsToday = signal(1240);
  readonly jobsToday = signal(6);

  readonly navItems = computed<NavItem[]>(() => [
    {
      key: 'overview',
      label: 'Overview',
      icon: 'grid',
      badge: this.online() && this.incoming() ? '1' : undefined,
    },
    { key: 'earnings', label: 'Earnings & payouts', icon: 'wallet' },
    { key: 'profile', label: 'Mechanic profile', icon: 'user' },
  ]);

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  });

  readonly pageTitle = computed(() => {
    switch (this.activeTab()) {
      case 'earnings':
        return 'Earnings & payouts';
      case 'profile':
        return 'Mechanic profile';
      default:
        return `${this.greeting()}, ${this.auth.firstName()}`;
    }
  });

  readonly pageSubtitle = computed(() => {
    switch (this.activeTab()) {
      case 'earnings':
        return 'Your payouts, weekly trend, and completed job history.';
      case 'profile':
        return 'Keep your details current so riders know who is coming.';
      default:
        return this.online()
          ? 'You are online and visible to riders nearby.'
          : 'You are offline. Go online to start receiving job requests.';
    }
  });

  readonly weekly = [
    { day: 'Mon', value: 42, amount: '₹820' },
    { day: 'Tue', value: 64, amount: '₹1,240' },
    { day: 'Wed', value: 38, amount: '₹740' },
    { day: 'Thu', value: 72, amount: '₹1,390' },
    { day: 'Fri', value: 88, amount: '₹1,710' },
    { day: 'Sat', value: 100, amount: '₹1,940' },
    { day: 'Sun', value: 56, amount: '₹1,080' },
  ];

  readonly payouts = [
    { id: 'PO-8841', date: '02 Nov 2026', amount: '₹3,420', status: 'Processing' },
    { id: 'PO-8790', date: '26 Oct 2026', amount: '₹6,780', status: 'Paid' },
    { id: 'PO-8731', date: '19 Oct 2026', amount: '₹5,940', status: 'Paid' },
    { id: 'PO-8677', date: '12 Oct 2026', amount: '₹7,120', status: 'Paid' },
  ];

  readonly recentJobs = [
    { id: 'MR-2477', date: 'Today', customer: 'Aarav Mehta', service: 'Puncture repair', amount: '₹278' },
    { id: 'MR-2452', date: 'Today', customer: 'Meera Joshi', service: 'Battery jump-start', amount: '₹249' },
    { id: 'MR-2438', date: 'Yesterday', customer: 'Rahul Verma', service: 'Chain adjustment', amount: '₹229' },
  ];

  readonly radiusOptions = ['5 km', '8 km', '12 km', '20 km'];

  readonly profileForm = this.fb.nonNullable.group({
    fullName: [this.auth.user()?.fullName ?? '', [Validators.required, Validators.minLength(2)]],
    phone: [this.auth.user()?.phone ?? '', [Validators.required]],
    workshop: ['Kumar Two-Wheelers, Whitefield', [Validators.required]],
    radius: ['12 km', [Validators.required]],
  });

  constructor() {
    this.incoming.set({
      id: 'MR-2493',
      customer: 'Sneha Patil',
      initials: 'SP',
      service: 'Battery jump-start',
      icon: 'battery',
      vehicle: 'Yamaha MT-15 · KA 05 EF 9012',
      distance: '2.1 km',
      payout: 320,
      eta: '6 min',
      note: 'Bike will not start. I am in the office parking basement, level B1.',
      status: 'accepted',
    });

    this.active.set({
      id: 'MR-2477',
      customer: 'Aarav Mehta',
      initials: 'AM',
      service: 'Puncture & tyre repair',
      icon: 'tire',
      vehicle: 'Hero Splendor · KA 05 AB 1234',
      distance: '0.8 km',
      payout: 278,
      eta: '4 min',
      note: 'Rear tyre is losing pressure. Pulled over near the Forum mall underpass.',
      status: 'en_route',
    });
  }

  setTab(tab: string): void {
    this.activeTab.set(tab as MechanicTab);
  }

  toggleOnline(): void {
    const next = !this.online();
    this.online.set(next);

    if (next) {
      this.toasts.show('You are online. New job requests will appear here.', 'success');
      if (!this.incoming() && !this.active()) {
        setTimeout(() => this.offerDemoJob(), 1800);
      }
    } else {
      this.incoming.set(null);
      this.toasts.show('You are offline. You will not receive new requests.', 'info');
    }
  }

  acceptJob(): void {
    const job = this.incoming();
    if (!job) return;

    this.incoming.set(null);

    if (!this.active()) {
      this.active.set({ ...job, status: 'en_route' });
      this.toasts.show(`Job accepted. Head to ${job.distance} away.`, 'success');
      return;
    }

    this.queue.update((queue) => [...queue, { ...job, status: 'accepted' }]);
    this.toasts.show('Job accepted and added to your queue.', 'success');
  }

  declineJob(): void {
    this.incoming.set(null);
    this.toasts.show('Request declined. It will be offered to another mechanic.', 'info');
  }

  advanceJob(): void {
    const job = this.active();
    if (!job) return;

    if (job.status === 'en_route') {
      this.active.set({ ...job, status: 'arrived' });
      this.toasts.show('Marked as arrived. Start the repair when ready.', 'success');
      return;
    }

    if (job.status === 'arrived') {
      this.completeJob(job);
    }
  }

  withdraw(): void {
    this.toasts.show('Payout requested. Funds arrive in 1–2 working days.', 'success');
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    this.auth.updateProfile({ fullName: value.fullName.trim(), phone: value.phone });
    this.toasts.show('Mechanic profile updated.', 'success');
  }

  private completeJob(job: Job): void {
    this.earningsToday.update((total) => total + job.payout);
    this.jobsToday.update((count) => count + 1);

    const next = this.queue()[0] ?? null;
    this.queue.update((queue) => queue.slice(1));
    this.active.set(next ? { ...next, status: 'en_route' } : null);

    this.toasts.show(`Job complete. ₹${job.payout} added to today's earnings.`, 'success');

    if (!next && this.online()) {
      setTimeout(() => this.offerDemoJob(), 4000);
    }
  }

  private offerDemoJob(): void {
    if (!this.online() || this.incoming() || this.active() || this.queue().length) return;

    this.incoming.set({
      id: `MR-${Math.floor(2500 + Math.random() * 400)}`,
      customer: 'Nikhil Shetty',
      initials: 'NS',
      service: 'Fuel delivery',
      icon: 'fuel',
      vehicle: 'TVS Apache RTR 200 · KA 05 GH 3344',
      distance: '3.4 km',
      payout: 199,
      eta: '9 min',
      note: 'Ran out of fuel on the service road near Hope Farm junction.',
      status: 'accepted',
    });
    this.toasts.show('New job request nearby.', 'info');
  }
}
