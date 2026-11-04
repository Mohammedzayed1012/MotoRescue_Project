import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { UserRole } from '../../core/models';
import { AuthShell } from '../../shared/auth-shell/auth-shell';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, Icon],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);
  readonly formSubmitted = signal(false);

  readonly roles: {
    value: UserRole;
    title: string;
    description: string;
    icon: 'bike' | 'wrench' | 'grid';
  }[] = [
    {
      value: 'CUSTOMER',
      title: 'I ride',
      description: 'Request help and track rescues',
      icon: 'bike',
    },
    {
      value: 'MECHANIC',
      title: 'I fix bikes',
      description: 'Earn as a verified partner',
      icon: 'wrench',
    },
    {
      value: 'ADMIN',
      title: 'I run operations',
      description: 'Dispatch, verify, and monitor',
      icon: 'grid',
    },
  ];

  private readonly passwordsMatch = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  };

  readonly form = this.fb.nonNullable.group(
    {
      role: this.fb.nonNullable.control<UserRole>('CUSTOMER'),
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [
        '',
        [Validators.required, Validators.pattern(/^(?:\+91[\s-]?)?[6-9]\d{9}$/)],
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: this.passwordsMatch },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  /** Keeps the role cards, heading and note in sync with the radio group. */
  readonly roleValue = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });

  readonly strength = computed(() => {
    const value = this.passwordValue() ?? '';
    let score = 0;

    if (value.length >= 8) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    const labels = ['Too short', 'Weak', 'Fair', 'Strong', 'Excellent'];
    const tone = score <= 1 ? 'weak' : score === 2 ? 'fair' : 'strong';

    return {
      score,
      tone,
      label: value ? labels[score] : 'Use 8+ characters',
    };
  });

  readonly heading = computed(() => {
    switch (this.roleValue()) {
      case 'MECHANIC':
        return 'Join as a mechanic';
      case 'ADMIN':
        return 'Create an operations account';
      default:
        return 'Create your account';
    }
  });

  readonly subheading = computed(() => {
    switch (this.roleValue()) {
      case 'MECHANIC':
        return 'Apply to earn with MotoRescue. We verify every partner before their first job.';
      case 'ADMIN':
        return 'Run dispatch, verify partners, and monitor every live rescue from one console.';
      default:
        return 'Free to join. Request help, track a rescue, and keep your bikes in one place.';
    }
  });

  /** Template helper: the role radio group lives on the reactive form. */
  readonly isMechanic = computed(() => this.roleValue() === 'MECHANIC');
  readonly isAdmin = computed(() => this.roleValue() === 'ADMIN');

  constructor() {
    const role = this.route.snapshot.queryParamMap.get('role');
    if (role === 'mechanic') {
      this.form.controls.role.setValue('MECHANIC');
    }
  }

  submit(): void {
    this.formSubmitted.set(true);
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const value = this.form.getRawValue();

    this.auth
      .register({
        fullName: value.fullName.trim(),
        email: value.email.trim(),
        phone: value.phone.replace(/[\s-]/g, ''),
        password: value.password,
        role: value.role,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.toasts.show(
            `Welcome to MotoRescue, ${this.auth.firstName()}. Your account is ready.`,
            'success',
          );
          this.router.navigate([this.auth.dashboardPath()]);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(this.friendlyError(error));
        },
      });
  }

  fullNameError(): string {
    const control = this.form.controls.fullName;
    if (!this.shouldShowError(control)) return '';
    if (control.hasError('required')) return 'Enter your full name.';
    if (control.hasError('minlength')) return 'Use at least 2 characters.';
    return '';
  }

  emailError(): string {
    const control = this.form.controls.email;
    if (!this.shouldShowError(control)) return '';
    if (control.hasError('required')) return 'Enter your email address.';
    if (control.hasError('email')) return 'That does not look like a valid email.';
    return '';
  }

  phoneError(): string {
    const control = this.form.controls.phone;
    if (!this.shouldShowError(control)) return '';
    if (control.hasError('required')) return 'Enter your mobile number.';
    if (control.hasError('pattern')) {
      return 'Use a 10-digit mobile number, optionally with +91.';
    }
    return '';
  }

  passwordError(): string {
    const control = this.form.controls.password;
    if (!this.shouldShowError(control)) return '';
    if (control.hasError('required')) return 'Create a password.';
    if (control.hasError('minlength')) return 'Use at least 8 characters.';
    return '';
  }

  confirmError(): string {
    const control = this.form.controls.confirmPassword;
    const visible = control.touched || this.formSubmitted();

    if (!visible) return '';
    if (control.hasError('required')) return 'Confirm your password.';
    if (this.form.hasError('mismatch')) return 'Those passwords do not match yet.';

    return '';
  }

  termsError(): boolean {
    return this.form.controls.terms.invalid && this.formSubmitted();
  }

  private shouldShowError(control: {
    invalid: boolean;
    touched: boolean;
  }): boolean {
    return control.invalid && (control.touched || this.formSubmitted());
  }

  private friendlyError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'We could not reach the MotoRescue service. Check that the backend is running and try again.';
    }

    const message = (error.error as { message?: string } | null)?.message;
    if (typeof message === 'string' && message) {
      return message;
    }

    return 'We could not create your account. Please check your details and try again.';
  }
}
