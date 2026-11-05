import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AuthShell } from '../../shared/auth-shell/auth-shell';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, Icon],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly showPassword = signal(false);
  readonly formSubmitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get('pending') === 'mechanic') {
      this.notice.set(
        'Application received. An admin must approve your mechanic account before you can sign in.',
      );
    }
  }

  submit(): void {
    this.formSubmitted.set(true);
    this.error.set('');
    this.notice.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.toasts.show(`Welcome back, ${this.auth.firstName()}.`, 'success');

        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        const target =
          redirect && redirect.startsWith('/') ? redirect : this.auth.dashboardPath();

        this.router.navigateByUrl(target);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.friendlyError(error));
      },
    });
  }

  showPasswordReset(): void {
    this.notice.set(
      'Password resets are handled by the rescue desk. Call +91 80000 00000 and we will help you back in.',
    );
  }

  emailError(): string {
    const control = this.form.controls.email;
    if (!this.shouldShowError(control)) return '';
    if (control.hasError('required')) return 'Enter your email address.';
    if (control.hasError('email')) return 'That does not look like a valid email.';
    return '';
  }

  passwordError(): string {
    const control = this.form.controls.password;
    if (!this.shouldShowError(control)) return '';
    if (control.hasError('required')) return 'Enter your password.';
    if (control.hasError('minlength')) return 'Passwords are at least 6 characters.';
    return '';
  }

  private shouldShowError(control: { invalid: boolean; touched: boolean }): boolean {
    return control.invalid && (control.touched || this.formSubmitted());
  }

  private friendlyError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'We could not reach the MotoRescue service. Check that the backend is running and try again.';
    }

    if (error.status === 401) {
      return 'That email and password do not match our records. Please try again.';
    }

    const message = (error.error as { message?: string } | null)?.message;
    return typeof message === 'string' && message
      ? message
      : 'Something went wrong. Please try again in a moment.';
  }
}
