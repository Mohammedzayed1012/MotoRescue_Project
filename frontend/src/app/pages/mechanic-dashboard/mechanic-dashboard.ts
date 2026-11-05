import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ApiRescueRequest } from '../../core/models';
import { DashboardShell, NavItem } from '../../shared/dashboard-shell/dashboard-shell';
import { Icon } from '../../shared/icon/icon';

type MechanicTab = 'overview' | 'earnings' | 'profile';

interface PayoutRow {
  id: string;
  date: string;
  amount: string;
  status: string;
}

interface RecentRow {
  id: string;
  date: string;
  customer: string;
  service: string;
  amount: string;
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
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<MechanicTab>('overview');
  readonly online = signal(this.auth.user()?.online ?? false);
  readonly openJobs = signal<ApiRescueRequest[]>([]);
  readonly myJobs = signal<ApiRescueRequest[]>([]);

  readonly active = computed(
    () =>
      this.myJobs().find(
        (job) => job.status === 'EN_ROUTE' || job.status === 'ARRIVED',
      ) ?? null,
  );

  readonly incoming = computed(() => {
    if (!this.online() || this.active()) return null;
    return this.openJobs()[0] ?? null;
  });

  readonly queue = computed(() => {
    if (!this.online()) return [];
    return this.openJobs().slice(this.incoming() ? 1 : 0, 4);
  });

  readonly weekJobs = computed(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return this.completedJobs().filter(
      (job) => job.completedAt && new Date(job.completedAt).getTime() >= cutoff,
    ).length;
  });

  readonly weekEarnings = computed(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return this.completedJobs()
      .filter((job) => job.completedAt && new Date(job.completedAt).getTime() >= cutoff)
      .reduce((total, job) => total + (job.payout ?? 0), 0);
  });

  readonly averagePayout = computed(() => {
    const jobs = this.completedJobs();
    if (!jobs.length) return 0;
    return Math.round(
      jobs.reduce((total, job) => total + (job.payout ?? 0), 0) / jobs.length,
    );
  });

  readonly joinedLabel = computed(() => {
    const createdAt = this.auth.user()?.createdAt;
    if (!createdAt) return '—';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(date);
  });

  readonly completedJobs = computed(() =>
    this.myJobs().filter((job) => job.status === 'COMPLETED'),
  );

  readonly earningsToday = computed(() => {
    const today = new Date().toDateString();
    return this.completedJobs()
      .filter((job) => job.completedAt && new Date(job.completedAt).toDateString() === today)
      .reduce((total, job) => total + (job.payout ?? 0), 0);
  });

  readonly jobsToday = computed(() => {
    const today = new Date().toDateString();
    return this.completedJobs().filter(
      (job) => job.completedAt && new Date(job.completedAt).toDateString() === today,
    ).length;
  });

  readonly lifetimeEarnings = computed(() =>
    this.completedJobs().reduce((total, job) => total + (job.payout ?? 0), 0),
  );

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

  readonly weekly = computed(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const amounts = new Map<string, number>();
    const counts = new Map<string, number>();
    const now = new Date();

    for (const job of this.completedJobs()) {
      if (!job.completedAt) continue;
      const date = new Date(job.completedAt);
      const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
      if (diff > 6) continue;
      const key = date.toDateString();
      amounts.set(key, (amounts.get(key) ?? 0) + (job.payout ?? 0));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    let max = 0;
    const rows = days.map((day, index) => {
      const date = new Date(now);
      const offset = (now.getDay() + 6 - index) % 7;
      date.setDate(now.getDate() - offset);
      const value = amounts.get(date.toDateString()) ?? 0;
      max = Math.max(max, value);
      return {
        day,
        count: counts.get(date.toDateString()) ?? 0,
        value,
        amount: `₹${value}`,
      };
    });

    return rows.map((row) => ({
      ...row,
      value: max === 0 ? 6 : Math.max(6, Math.round((row.value * 100) / max)),
    }));
  });

  readonly weekLabel = computed(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    const format = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
    return `${format.format(start)} – ${format.format(end)}`;
  });

  readonly payouts = computed<PayoutRow[]>(() =>
    this.completedJobs().map((job) => ({
      id: job.reference,
      date: this.formatDate(job.completedAt ?? job.createdAt),
      amount: `₹${job.payout ?? 0}`,
      status: 'Settled',
    })),
  );

  readonly recentJobs = computed<RecentRow[]>(() =>
    this.completedJobs()
      .slice(0, 3)
      .map((job) => ({
        id: job.reference,
        date: this.formatDate(job.completedAt ?? job.createdAt),
        customer: job.riderName ?? 'Rider',
        service: job.serviceLabel ?? 'Rescue',
        amount: `₹${job.payout ?? 0}`,
      })),
  );

  readonly radiusOptions = ['5 km', '8 km', '12 km', '20 km'];

  readonly profileForm = this.fb.nonNullable.group({
    fullName: [this.auth.user()?.fullName ?? '', [Validators.required, Validators.minLength(2)]],
    phone: [this.auth.user()?.phone ?? '', [Validators.required]],
    workshop: [this.auth.user()?.workshop ?? '', [Validators.required]],
    radius: ['12 km', [Validators.required]],
  });

  constructor() {
    this.loadJobs();
    this.profileForm.controls.radius.setValue('12 km');

    interval(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadJobs());
  }

  setTab(tab: string): void {
    this.activeTab.set(tab as MechanicTab);
  }

  toggleOnline(): void {
    const mechanicId = this.auth.user()?.id;
    if (!mechanicId) return;

    const next = !this.online();
    this.online.set(next);

    this.api.setOnline(mechanicId, next).subscribe({
      next: (user) => {
        this.auth.applyUser(user);
        this.online.set(user.online);
        this.toasts.show(
          next
            ? 'You are online. New rider requests will appear here.'
            : 'You are offline. You will not receive new requests.',
          next ? 'success' : 'info',
        );
        this.loadJobs();
      },
      error: () => {
        this.online.set(!next);
        this.toasts.show('Could not change your availability. Try again.', 'error');
      },
    });
  }

  acceptJob(): void {
    const job = this.incoming();
    const mechanicId = this.auth.user()?.id;
    if (!job || !mechanicId) return;

    this.api.acceptRequest(job.id, mechanicId).subscribe({
      next: (request) => {
        this.toasts.show(
          `Job accepted. Head to ${request.location ?? 'the rider'} — they can see you on the map now.`,
          'success',
        );
        this.loadJobs();
      },
      error: (error: unknown) => {
        this.toasts.show(this.errorMessage(error, 'Could not accept this job.'), 'error');
        this.loadJobs();
      },
    });
  }

  declineJob(): void {
    const job = this.incoming();
    if (!job) return;

    this.openJobs.update((jobs) => jobs.filter((item) => item.id !== job.id));
    this.toasts.show('Request declined. It stays visible to other mechanics.', 'info');
  }

  advanceJob(): void {
    const job = this.active();
    const mechanicId = this.auth.user()?.id;
    if (!job || !mechanicId) return;

    if (job.status === 'EN_ROUTE') {
      this.api.arriveRequest(job.id, mechanicId).subscribe({
        next: () => {
          this.toasts.show('Marked as arrived. The rider has been notified.', 'success');
          this.loadJobs();
        },
        error: (error: unknown) => {
          this.toasts.show(this.errorMessage(error, 'Could not update the job.'), 'error');
        },
      });
      return;
    }

    if (job.status === 'ARRIVED') {
      this.api.completeRequest(job.id, mechanicId).subscribe({
        next: () => {
          this.toasts.show('Job complete. The rider and admin dashboards are updated.', 'success');
          this.loadJobs();
        },
        error: (error: unknown) => {
          this.toasts.show(this.errorMessage(error, 'Could not complete the job.'), 'error');
        },
      });
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

    const id = this.auth.user()?.id;
    if (!id) return;

    const value = this.profileForm.getRawValue();
    const radius = Number.parseInt(value.radius, 10) || 12;

    this.api
      .updateUser(id, {
        fullName: value.fullName.trim(),
        phone: value.phone.trim(),
        workshop: value.workshop.trim(),
        serviceRadiusKm: radius,
      })
      .subscribe({
        next: (user) => {
          this.auth.applyUser(user);
          this.toasts.show('Mechanic profile updated.', 'success');
        },
        error: (error: unknown) => {
          this.toasts.show(this.errorMessage(error, 'Could not update your profile.'), 'error');
        },
      });
  }

  fullNameError(): string {
    const control = this.profileForm.controls.fullName;
    if (!control.touched) return '';
    if (control.hasError('required')) return 'Enter your full name.';
    if (control.hasError('minlength')) return 'Use at least 2 characters.';
    return '';
  }

  phoneError(): string {
    const control = this.profileForm.controls.phone;
    if (!control.touched) return '';
    return control.hasError('required') ? 'Enter a mobile number riders can reach.' : '';
  }

  workshopError(): string {
    const control = this.profileForm.controls.workshop;
    if (!control.touched) return '';
    return control.hasError('required') ? 'Enter your workshop or base area.' : '';
  }

  initialsFor(name?: string): string {
    if (!name) return 'RD';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  private loadJobs(): void {
    const mechanicId = this.auth.user()?.id;
    if (!mechanicId) return;

    this.api.mechanicRequests(mechanicId).subscribe({
      next: (jobs) => {
        // Admin can revoke verification at any time; end the session the
        // moment the account is no longer an approved partner.
        if (this.auth.user()?.role === 'MECHANIC' && this.auth.user()?.verified === false) {
          this.auth.logout();
          this.router.navigate(['/login'], { queryParams: { pending: 'mechanic' } });
          return;
        }
        this.myJobs.set(jobs);
      },
      error: () => this.myJobs.set([]),
    });

    this.api.openRequests().subscribe({
      next: (jobs) => this.openJobs.set(jobs),
      error: () => this.openJobs.set([]),
    });
  }

  private formatDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private errorMessage(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: string } })?.error?.message;
    return typeof message === 'string' && message ? message : fallback;
  }
}
