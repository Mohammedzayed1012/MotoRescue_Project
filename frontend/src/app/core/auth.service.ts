import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  AuthResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UserRole,
} from './models';

const STORAGE_KEY = 'motorescue.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/api/auth';

  readonly user = signal<AuthUser | null>(this.restoreSession());
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly role = computed<UserRole | null>(() => this.user()?.role ?? null);
  readonly firstName = computed(() => this.user()?.fullName.split(' ')[0] ?? 'Rider');

  constructor(private http: HttpClient) {}

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((response) => this.persist(response, payload.email)),
    );
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, payload).pipe(
      tap((response) => this.persist(response, payload.email, payload.role)),
    );
  }

  /** Opens a clearly-labelled local workspace so the product can be reviewed without the API. */
  startDemo(role: UserRole): AuthUser {
    const demoUsers: Record<UserRole, AuthUser> = {
      CUSTOMER: {
        fullName: 'Aarav Mehta',
        email: 'aarav@demo.motorescue',
        phone: '+91 98765 43210',
        role: 'CUSTOMER',
        demo: true,
      },
      MECHANIC: {
        fullName: 'Ravi Kumar',
        email: 'ravi@demo.motorescue',
        phone: '+91 98111 22334',
        role: 'MECHANIC',
        demo: true,
      },
      ADMIN: {
        fullName: 'Priya Nair',
        email: 'priya@demo.motorescue',
        phone: '+91 90000 11223',
        role: 'ADMIN',
        demo: true,
      },
    };

    const user = demoUsers[role];
    this.user.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    return user;
  }

  logout(): void {
    this.user.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  updateProfile(changes: Partial<Pick<AuthUser, 'fullName' | 'phone'>>): void {
    const current = this.user();
    if (!current) return;

    const updated: AuthUser = { ...current, ...changes };
    this.user.set(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  dashboardPath(role: UserRole | null = this.role()): string {
    switch (role) {
      case 'MECHANIC':
        return '/mechanic';
      case 'ADMIN':
        return '/admin';
      case 'CUSTOMER':
        return '/customer';
      default:
        return '/login';
    }
  }

  private persist(
    response: AuthResponse,
    fallbackEmail: string,
    fallbackRole: UserRole = 'CUSTOMER',
  ): void {
    const current = this.user();
    const role = this.normalizeRole(response.role) ?? current?.role ?? fallbackRole;

    const user: AuthUser = {
      id: response.userId,
      fullName: response.fullName || current?.fullName || fallbackEmail.split('@')[0],
      email: response.email || fallbackEmail,
      phone: current?.phone,
      role,
    };

    this.user.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  private restoreSession(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as AuthUser;
      if (!parsed?.email || !parsed?.role) return null;

      return parsed;
    } catch {
      return null;
    }
  }

  private normalizeRole(role?: string): UserRole | null {
    if (!role) return null;

    const value = role.toUpperCase();
    if (value === 'MECHANIC' || value === 'ADMIN' || value === 'CUSTOMER') {
      return value;
    }

    return null;
  }
}
