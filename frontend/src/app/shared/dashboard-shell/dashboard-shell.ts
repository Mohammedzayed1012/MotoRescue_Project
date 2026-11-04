import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Icon, IconName } from '../icon/icon';
import { Logo } from '../logo/logo';

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: string;
}

@Component({
  selector: 'app-dashboard-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Logo],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.scss',
})
export class DashboardShell {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  readonly nav = input.required<NavItem[]>();
  readonly active = input.required<string>();
  readonly title = input('Overview');
  readonly subtitle = input('');
  readonly roleLabel = input('Workspace');

  readonly activeChange = output<string>();
  readonly menuOpen = signal(false);

  readonly initials = computed(() => {
    const name = this.auth.user()?.fullName ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  });

  readonly email = computed(() => this.auth.user()?.email ?? '');

  select(key: string): void {
    this.activeChange.emit(key);
    this.menuOpen.set(false);
  }

  notify(): void {
    this.toasts.show('You are all caught up — no new alerts.', 'info');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
