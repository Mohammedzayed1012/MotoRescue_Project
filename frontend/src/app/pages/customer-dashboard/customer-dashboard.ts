import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { BookingService } from '../../core/booking.service';
import { ToastService } from '../../core/toast.service';
import { ApiRescueRequest, ApiUser, Bike, RequestStatus } from '../../core/models';
import { DashboardShell, NavItem } from '../../shared/dashboard-shell/dashboard-shell';
import { Icon, IconName } from '../../shared/icon/icon';
import { TrackingMap } from '../../shared/tracking-map/tracking-map';

type RiderTab = 'overview' | 'request' | 'bikes' | 'history' | 'profile';

interface ServiceOption {
  id: string;
  label: string;
  icon: IconName;
}

interface HistoryRow {
  id: string;
  date: string;
  service: string;
  mechanic: string;
  bike: string;
  amount: string;
  status: 'Completed' | 'Cancelled';
}

const ACTIVE_STATUSES: RequestStatus[] = ['SEARCHING', 'EN_ROUTE', 'ARRIVED'];

@Component({
  selector: 'app-customer-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DashboardShell, Icon, TrackingMap],
  templateUrl: './customer-dashboard.html',
  styleUrl: './customer-dashboard.scss',
})
export class CustomerDashboard {
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'request', label: 'Request help', icon: 'zap' },
    { key: 'bikes', label: 'My bikes', icon: 'bike' },
    { key: 'history', label: 'Rescue history', icon: 'history' },
    { key: 'profile', label: 'Account settings', icon: 'user' },
  ];

  readonly activeTab = signal<RiderTab>('overview');
  readonly requests = signal<ApiRescueRequest[]>([]);
  readonly bikes = signal<Bike[]>([]);
  readonly mechanics = signal<ApiUser[]>([]);
  readonly loading = signal(true);
  readonly requesting = signal(false);
  readonly addBikeOpen = signal(false);
  readonly historyQuery = signal('');
  readonly locating = signal(false);
  readonly liveLocation = signal(false);

  private readonly liveLat = signal<number | null>(null);
  private readonly liveLng = signal<number | null>(null);

  readonly serviceOptions: ServiceOption[] = [
    { id: 'puncture', label: 'Puncture & tyre repair', icon: 'tire' },
    { id: 'battery', label: 'Battery & starting', icon: 'battery' },
    { id: 'fuel', label: 'Fuel delivery', icon: 'fuel' },
    { id: 'repair', label: 'General repair', icon: 'wrench' },
    { id: 'chain', label: 'Chain & clutch', icon: 'chain' },
    { id: 'tow', label: 'Towing & recovery', icon: 'tow' },
  ];

  readonly request = computed<ApiRescueRequest | null>(
    () => this.requests().find((item) => ACTIVE_STATUSES.includes(item.status)) ?? null,
  );

  readonly history = computed<HistoryRow[]>(() =>
    this.requests()
      .filter((item) => item.status === 'COMPLETED' || item.status === 'CANCELLED')
      .map((item) => ({
        id: item.reference,
        date: this.formatDate(item.completedAt ?? item.cancelledAt ?? item.createdAt),
        service: item.serviceLabel ?? 'Roadside assistance',
        mechanic: item.mechanicName ?? '—',
        bike: item.bikeLabel ?? '—',
        amount: item.quote ?? '—',
        status: item.status === 'COMPLETED' ? 'Completed' : 'Cancelled',
      })),
  );

  readonly recentHistory = computed(() => this.history().slice(0, 3));
  readonly primaryBike = computed(
    () => this.bikes().find((bike) => bike.primaryBike) ?? this.bikes()[0] ?? null,
  );

  readonly mechanicsNear = computed(() =>
    [...this.mechanics()]
      .sort((a, b) => Number(b.online) - Number(a.online) || b.totalJobs - a.totalJobs)
      .slice(0, 3),
  );

  readonly onlineMechanics = computed(
    () => this.mechanics().filter((mechanic) => mechanic.online).length,
  );

  readonly requestForm = this.fb.nonNullable.group({
    service: ['puncture', [Validators.required]],
    bike: ['other', [Validators.required]],
    location: ['', [Validators.required]],
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
      case 'SEARCHING':
        return { label: 'Finding a mechanic', tone: 'amber' };
      case 'EN_ROUTE':
        return { label: 'On the way', tone: 'brand' };
      case 'ARRIVED':
        return { label: 'Arrived', tone: 'green' };
      case 'COMPLETED':
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
    const order: Record<string, number> = {
      SEARCHING: 0,
      EN_ROUTE: 2,
      ARRIVED: 3,
      COMPLETED: 4,
    };
    return status ? (order[status] ?? -1) : -1;
  });

  readonly selectedService = computed(() => {
    const id = this.requestForm.controls.service.value;
    return this.serviceOptions.find((option) => option.id === id) ?? this.serviceOptions[0];
  });

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
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'request' || tab === 'bikes' || tab === 'history' || tab === 'profile') {
      this.activeTab.set(tab);
    }

    const service = this.route.snapshot.queryParamMap.get('service');
    if (service && this.serviceOptions.some((option) => option.id === service)) {
      this.requestForm.controls.service.setValue(service);
    }

    this.loadAll();

    interval(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadRequests());
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

    const user = this.auth.user();
    if (!user?.id) {
      this.toasts.show('Please log in again to request a rescue.', 'error');
      return;
    }

    const value = this.requestForm.getRawValue();
    const service = this.serviceOptions.find((option) => option.id === value.service);
    const selectedBike = this.bikes().find((bike) => String(bike.id) === value.bike);
    const bikeLabel = selectedBike
      ? `${selectedBike.name} · ${selectedBike.regNo}`
      : 'Other bike';

    this.requesting.set(true);
    this.api
      .createRequest({
        riderId: user.id,
        serviceId: value.service,
        serviceLabel: service?.label ?? 'Roadside assistance',
        icon: service?.icon ?? 'wrench',
        bikeLabel,
        location: value.location.trim(),
        latitude: this.liveLat(),
        longitude: this.liveLng(),
        notes: value.notes.trim(),
      })
      .subscribe({
        next: () => {
          this.requesting.set(false);
          this.activeTab.set('overview');
          this.requestForm.controls.notes.reset('');
          this.toasts.show(
            'Request sent. Your mechanic can see it right now.',
            'success',
          );
          this.loadRequests();
        },
        error: (error: unknown) => {
          this.requesting.set(false);
          this.toasts.show(this.errorMessage(error, 'Could not send your request.'), 'error');
        },
      });
  }

  cancelRequest(): void {
    const request = this.request();
    const riderId = this.auth.user()?.id;
    if (!request || !riderId) return;

    this.api.cancelRequest(request.id, riderId).subscribe({
      next: () => {
        this.toasts.show('Rescue request cancelled. You can request again anytime.', 'info');
        this.loadRequests();
      },
      error: (error: unknown) => {
        this.toasts.show(this.errorMessage(error, 'Could not cancel the request.'), 'error');
      },
    });
  }

  callSupport(): void {
    this.router.navigate(['/support']);
  }

  useLiveLocation(): void {
    if (this.locating()) return;

    if (!navigator.geolocation) {
      this.toasts.show('Live location is not available in this browser. Type your area instead.', 'info');
      return;
    }

    this.locating.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.liveLat.set(lat);
        this.liveLng.set(lng);

        const label = this.describeCoordinates(lat, lng);
        this.requestForm.controls.location.setValue(label);
        this.requestForm.controls.location.markAsTouched();
        this.liveLocation.set(true);
        this.locating.set(false);

        this.toasts.show(
          'Live location captured. Your mechanic will navigate straight to your pin.',
          'success',
        );
      },
      () => {
        this.locating.set(false);
        this.toasts.show(
          'Location permission was not granted. Type your area or landmark instead.',
          'info',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  addBike(): void {
    if (this.addBikeForm.invalid) {
      this.addBikeForm.markAllAsTouched();
      return;
    }

    const riderId = this.auth.user()?.id;
    if (!riderId) return;

    const value = this.addBikeForm.getRawValue();

    this.api
      .addBike({
        ownerId: riderId,
        name: value.name.trim(),
        regNo: value.regNo.toUpperCase().trim(),
        year: value.year.trim(),
        odometer: '0 km',
      })
      .subscribe({
        next: () => {
          this.addBikeForm.reset();
          this.addBikeOpen.set(false);
          this.toasts.show('Bike added to your garage.', 'success');
          this.loadBikes();
        },
        error: (error: unknown) => {
          this.toasts.show(this.errorMessage(error, 'Could not save this bike.'), 'error');
        },
      });
  }

  removeBike(bike: Bike): void {
    this.api.removeBike(bike.id).subscribe({
      next: () => {
        this.toasts.show(`${bike.name} removed from your garage.`, 'info');
        this.loadBikes();
      },
      error: (error: unknown) => {
        this.toasts.show(this.errorMessage(error, 'Could not remove this bike.'), 'error');
      },
    });
  }

  makePrimary(bike: Bike): void {
    this.api.makePrimaryBike(bike.id).subscribe({
      next: () => {
        this.toasts.show(`${bike.name} is now your primary bike.`, 'success');
        this.loadBikes();
      },
      error: (error: unknown) => {
        this.toasts.show(this.errorMessage(error, 'Could not update your primary bike.'), 'error');
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const id = this.auth.user()?.id;
    if (!id) return;

    const value = this.profileForm.getRawValue();

    this.api
      .updateUser(id, { fullName: value.fullName.trim(), phone: value.phone.trim() })
      .subscribe({
        next: (user) => {
          this.auth.applyUser(user);
          this.toasts.show('Account details updated.', 'success');
        },
        error: (error: unknown) => {
          this.toasts.show(this.errorMessage(error, 'Could not update your details.'), 'error');
        },
      });
  }

  locationError(): string {
    const control = this.requestForm.controls.location;
    if (!control.touched || !control.invalid) return '';
    return 'Tell us where you are so we can send the closest mechanic.';
  }

  bikeNameError(): string {
    const control = this.addBikeForm.controls.name;
    if (!control.touched) return '';
    if (control.hasError('required')) return 'Enter the bike model.';
    if (control.hasError('minlength')) return 'Use at least 2 characters.';
    return '';
  }

  bikeRegError(): string {
    const control = this.addBikeForm.controls.regNo;
    if (!control.touched) return '';
    if (control.hasError('required')) return 'Enter the registration number.';
    if (control.hasError('minlength')) return 'Enter the full registration number.';
    return '';
  }

  bikeYearError(): string {
    const control = this.addBikeForm.controls.year;
    if (!control.touched) return '';
    return control.hasError('required') ? 'Enter the model year.' : '';
  }

  profileNameError(): string {
    const control = this.profileForm.controls.fullName;
    if (!control.touched) return '';
    if (control.hasError('required')) return 'Enter your full name.';
    if (control.hasError('minlength')) return 'Use at least 2 characters.';
    return '';
  }

  profilePhoneError(): string {
    const control = this.profileForm.controls.phone;
    if (!control.touched) return '';
    return control.hasError('required') ? 'Enter a mobile number riders can reach.' : '';
  }

  upgrade(): void {
    this.toasts.show('Rescue+ checkout is coming soon. Your current plan is unchanged.', 'info');
  }

  initialsFor(name?: string): string {
    if (!name) return 'MR';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  private loadAll(): void {
    this.loadRequests();
    this.loadBikes();
    this.loadMechanics();
  }

  private loadRequests(): void {
    const riderId = this.auth.user()?.id;
    if (!riderId) {
      this.loading.set(false);
      return;
    }

    const before = this.request();

    this.api.riderRequests(riderId).subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.loading.set(false);

        const after = this.request();
        if (before && after && before.id === after.id && before.status !== after.status) {
          if (after.status === 'EN_ROUTE') {
            this.toasts.show(
              `${after.mechanicName ?? 'Your mechanic'} accepted your request and is on the way.`,
              'success',
            );
          } else if (after.status === 'ARRIVED') {
            this.toasts.show('Your mechanic has arrived at your location.', 'success');
          } else if (after.status === 'COMPLETED') {
            this.toasts.show('Rescue completed. Your receipt is in rescue history.', 'success');
          }
        }

        if (!before && after && after.status === 'EN_ROUTE') {
          this.toasts.show(
            `${after.mechanicName ?? 'Your mechanic'} accepted your request and is on the way.`,
            'success',
          );
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadBikes(): void {
    const riderId = this.auth.user()?.id;
    if (!riderId) return;

    this.api.bikes(riderId).subscribe({
      next: (bikes) => {
        this.bikes.set(bikes);
        const current = this.requestForm.controls.bike.value;
        const exists = bikes.some((bike) => String(bike.id) === current);
        if (!exists) {
          this.requestForm.controls.bike.setValue(bikes[0] ? String(bikes[0].id) : 'other');
        }
      },
      error: () => {
        // The form still allows "Other bike" if the garage cannot be loaded.
      },
    });
  }

  private loadMechanics(): void {
    this.api.mechanics().subscribe({
      next: (mechanics) => this.mechanics.set(mechanics),
      error: () => this.mechanics.set([]),
    });
  }

  private describeCoordinates(lat: number, lng: number): string {
    const areas = [
      { name: 'Whitefield, Bengaluru', lat: 12.9698, lng: 77.7499 },
      { name: 'Indiranagar, Bengaluru', lat: 12.9719, lng: 77.6412 },
      { name: 'Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 },
      { name: 'HSR Layout, Bengaluru', lat: 12.9121, lng: 77.6446 },
      { name: 'Jayanagar, Bengaluru', lat: 12.9299, lng: 77.5826 },
      { name: 'Hebbal, Bengaluru', lat: 13.0358, lng: 77.597 },
      { name: 'Electronic City, Bengaluru', lat: 12.8452, lng: 77.6602 },
    ];

    let nearest = areas[0];
    let best = Number.POSITIVE_INFINITY;

    for (const area of areas) {
      const distance = Math.hypot(area.lat - lat, area.lng - lng);
      if (distance < best) {
        best = distance;
        nearest = area;
      }
    }

    if (best < 0.14) {
      return nearest.name;
    }

    return `Live pin · ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
