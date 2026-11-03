import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Bike, HistoryEntry, Mechanic, RequestStatus, RescueRequest } from '../../core/models';
import { DashboardShell, NavItem } from '../../shared/dashboard-shell/dashboard-shell';
import { Icon, IconName } from '../../shared/icon/icon';
import { MapPreview } from '../../shared/map-preview/map-preview';

type RiderTab = 'overview' | 'request' | 'bikes' | 'history' | 'profile';

interface ServiceOption {
  id: string;
  label: string;
  icon: IconName;
}

@Component({
  selector: 'app-customer-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DashboardShell, Icon, MapPreview],
  templateUrl: './customer-dashboard.html',
  styleUrl: './customer-dashboard.scss',
})
export class CustomerDashboard {
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly navItems: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'request', label: 'Request help', icon: 'zap' },
    { key: 'bikes', label: 'My bikes', icon: 'bike' },
    { key: 'history', label: 'Rescue history', icon: 'history' },
    { key: 'profile', label: 'Account settings', icon: 'user' },
  ];

  readonly activeTab = signal<RiderTab>('overview');
  readonly request = signal<RescueRequest | null>(null);
  readonly requesting = signal(false);
  readonly addBikeOpen = signal(false);
  readonly historyQuery = signal('');
  readonly isDemo = computed(() => this.auth.user()?.demo === true);

  readonly serviceOptions: ServiceOption[] = [
    { id: 'puncture', label: 'Puncture & tyre repair', icon: 'tire' },
    { id: 'battery', label: 'Battery & starting', icon: 'battery' },
    { id: 'fuel', label: 'Fuel delivery', icon: 'fuel' },
    { id: 'repair', label: 'General repair', icon: 'wrench' },
    { id: 'chain', label: 'Chain & clutch', icon: 'chain' },
    { id: 'tow', label: 'Towing & recovery', icon: 'tow' },
  ];

  readonly mechanics: Mechanic[] = [
    {
      id: 'ravi',
      name: 'Ravi Kumar',
      initials: 'RK',
      rating: 4.9,
      jobs: 1284,
      distance: '1.2 km',
      specialty: 'Puncture & battery',
      verified: true,
      tone: 'green',
    },
    {
      id: 'imran',
      name: 'Imran Shaikh',
      initials: 'IS',
      rating: 4.8,
      jobs: 942,
      distance: '2.4 km',
      specialty: 'Engine & electrical',
      verified: true,
      tone: 'blue',
    },
    {
      id: 'deepak',
      name: 'Deepak Rao',
      initials: 'DR',
      rating: 4.7,
      jobs: 611,
      distance: '3.1 km',
      specialty: 'Brakes & chains',
      verified: true,
      tone: 'brand',
    },
  ];

  readonly bikes = signal<Bike[]>([]);
  readonly history = signal<HistoryEntry[]>([]);

  readonly requestForm = this.fb.nonNullable.group({
    service: ['puncture', [Validators.required]],
    bike: ['Other bike', [Validators.required]],
    location: [this.auth.user()?.demo ? 'Whitefield, Bengaluru' : '', [Validators.required]],
    notes: [''],
  });

  readonly addBikeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    regNo: ['', [Validators.required, Validators.minLength(5)]],
    year: ['', [Validators.required]],
  });

  readonly profileForm = this.fb.nonNullable.group({
    fullName: [this.auth.user()?.fullName ?? '', [Validators.required, Validators.minLength(2)]],
    email: [{ value: this.auth.user()?.email ?? '', disabled: true }],
    phone: [this.auth.user()?.phone ?? '', [Validators.required]],
    smsUpdates: [true],
    emailReceipts: [true],
  });

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  });

  readonly pageTitle = computed(() => {
    switch (this.activeTab()) {
      case 'request':
        return 'Request a mechanic';
      case 'bikes':
        return 'My bikes';
      case 'history':
        return 'Rescue history';
      case 'profile':
        return 'Account settings';
      default:
        return `${this.greeting()}, ${this.auth.firstName()}`;
    }
  });

  readonly pageSubtitle = computed(() => {
    switch (this.activeTab()) {
      case 'request':
        return 'Tell us what happened. We will match you with the closest verified mechanic.';
      case 'bikes':
        return 'Keep registration, service, and rescue details for every bike you ride.';
      case 'history':
        return 'Every rescue, receipt, and rating in one place.';
      case 'profile':
        return 'Manage your details and choose how we reach you.';
      default:
        return 'Here is what is happening with your rides today.';
    }
  });

  readonly requestStatus = computed(() => {
    const status = this.request()?.status;
    switch (status) {
      case 'searching':
        return { label: 'Finding a mechanic', tone: 'amber' };
      case 'assigned':
        return { label: 'Mechanic assigned', tone: 'blue' };
      case 'en_route':
        return { label: 'On the way', tone: 'brand' };
      case 'arrived':
        return { label: 'Arrived', tone: 'green' };
      case 'completed':
        return { label: 'Completed', tone: 'green' };
      default:
        return { label: 'No active rescue', tone: 'neutral' };
    }
  });

  readonly timeline = [
    { label: 'Request received', hint: 'We have your details' },
    { label: 'Mechanic assigned', hint: 'A verified partner accepts' },
    { label: 'On the way', hint: 'Tracked live on the map' },
    { label: 'Arrived', hint: 'Repair begins' },
  ];

  readonly activeStep = computed(() => {
    const status = this.request()?.status;
    const order: Record<RequestStatus, number> = {
      searching: 0,
      assigned: 1,
      en_route: 2,
      arrived: 3,
      completed: 4,
    };
    return status ? order[status] : -1;
  });

  readonly selectedService = computed(() => {
    const id = this.requestForm.controls.service.value;
    return this.serviceOptions.find((option) => option.id === id) ?? this.serviceOptions[0];
  });

  readonly recentHistory = computed(() => this.history().slice(0, 3));
  readonly primaryBike = computed(() => this.bikes()[0] ?? null);

  readonly filteredHistory = computed(() => {
    const query = this.historyQuery().trim().toLowerCase();
    if (!query) return this.history();

    return this.history().filter((entry) =>
      [entry.id, entry.service, entry.mechanic, entry.bike, entry.date].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  });

  constructor() {
    const demo = this.auth.user()?.demo === true;

    if (demo) {
      this.bikes.set([
        {
          id: 'bike-1',
          name: 'Hero Splendor Plus',
          regNo: 'KA 05 AB 1234',
          year: '2021',
          odometer: '24,300 km',
          tone: 'brand',
        },
        {
          id: 'bike-2',
          name: 'Royal Enfield Classic 350',
          regNo: 'KA 05 CD 5678',
          year: '2019',
          odometer: '41,800 km',
          tone: 'green',
        },
      ]);

      this.requestForm.controls.bike.setValue(
        `${this.bikes()[0].name} · ${this.bikes()[0].regNo}`,
      );

      this.history.set([
        {
          id: 'MR-2418',
          date: '12 Oct 2026',
          service: 'Puncture repair',
          mechanic: 'Ravi Kumar',
          bike: 'Hero Splendor',
          amount: '₹278',
          status: 'Completed',
        },
        {
          id: 'MR-2377',
          date: '28 Sep 2026',
          service: 'Battery jump-start',
          mechanic: 'Imran Shaikh',
          bike: 'Classic 350',
          amount: '₹249',
          status: 'Completed',
        },
        {
          id: 'MR-2290',
          date: '03 Aug 2026',
          service: 'Chain adjustment',
          mechanic: 'Deepak Rao',
          bike: 'Hero Splendor',
          amount: '₹229',
          status: 'Completed',
        },
        {
          id: 'MR-2214',
          date: '19 Jun 2026',
          service: 'Fuel delivery',
          mechanic: 'Ravi Kumar',
          bike: 'Classic 350',
          amount: '₹199',
          status: 'Completed',
        },
      ]);

      this.request.set({
        id: 'MR-2481',
        service: 'Puncture & tyre repair',
        icon: 'tire',
        bike: 'Hero Splendor Plus · KA 05 AB 1234',
        location: 'Whitefield, Bengaluru',
        status: 'en_route',
        eta: '8 min',
        price: '₹180 – ₹240',
        note: 'Rear tyre losing pressure. Pulled over near the Forum mall underpass.',
        mechanic: this.mechanics[0],
        createdAt: 'Today, 4:12 PM',
      });
    }

    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'request' || tab === 'bikes' || tab === 'history' || tab === 'profile') {
      this.activeTab.set(tab);
    }

    const service = this.route.snapshot.queryParamMap.get('service');
    if (service && this.serviceOptions.some((option) => option.id === service)) {
      this.requestForm.controls.service.setValue(service);
    }
  }

  setTab(tab: string): void {
    this.activeTab.set(tab as RiderTab);
  }

  submitRequest(): void {
    if (this.requesting()) return;

    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.requesting.set(true);
    const value = this.requestForm.getRawValue();
    const service = this.serviceOptions.find((option) => option.id === value.service);

    setTimeout(() => {
      this.request.set({
        id: `MR-${Math.floor(2500 + Math.random() * 400)}`,
        service: service?.label ?? 'Roadside assistance',
        icon: service?.icon ?? 'wrench',
        bike: value.bike,
        location: value.location,
        status: 'searching',
        eta: '—',
        price: 'Quote on accept',
        note: value.notes,
        createdAt: 'Just now',
      });

      this.requesting.set(false);
      this.activeTab.set('overview');
      this.toasts.show('Request sent. We are finding the closest mechanic.', 'success');

      setTimeout(() => {
        const current = this.request();
        if (!current || current.status !== 'searching') return;

        this.request.set({
          ...current,
          status: 'en_route',
          eta: '11 min',
          price: '₹249 – ₹320',
          mechanic: this.mechanics[0],
        });
        this.toasts.show('Ravi Kumar accepted your request and is on the way.', 'info');
      }, 6000);
    }, 900);
  }

  cancelRequest(): void {
    this.request.set(null);
    this.toasts.show('Rescue request cancelled. You can request again anytime.', 'info');
  }

  callSupport(): void {
    this.toasts.show('Connecting you to the 24/7 rescue desk…', 'info');
  }

  addBike(): void {
    if (this.addBikeForm.invalid) {
      this.addBikeForm.markAllAsTouched();
      return;
    }

    const value = this.addBikeForm.getRawValue();
    this.bikes.update((bikes) => [
      ...bikes,
      {
        id: `bike-${Date.now()}`,
        name: value.name.trim(),
        regNo: value.regNo.toUpperCase().trim(),
        year: value.year,
        odometer: '0 km',
        tone: 'blue',
      },
    ]);

    this.addBikeForm.reset();
    this.addBikeOpen.set(false);
    this.toasts.show('Bike added to your garage.', 'success');
  }

  removeBike(bike: Bike): void {
    this.bikes.update((bikes) => bikes.filter((item) => item.id !== bike.id));
    this.toasts.show(`${bike.name} removed from your garage.`, 'info');
  }

  makePrimary(bike: Bike): void {
    this.bikes.update((bikes) => [bike, ...bikes.filter((item) => item.id !== bike.id)]);
    this.toasts.show(`${bike.name} is now your primary bike.`, 'success');
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    this.auth.updateProfile({ fullName: value.fullName.trim(), phone: value.phone });
    this.toasts.show('Account details updated.', 'success');
  }

  upgrade(): void {
    this.toasts.show('Rescue+ checkout is coming soon. Your current plan is unchanged.', 'info');
  }
}
