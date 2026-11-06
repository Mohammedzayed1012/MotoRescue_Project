import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  ApiUser,
  AuthResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UserRole,
} from './models';

const STORAGE_KEY = 'motorescue.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/auth';

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

  logout(): void {
    this.user.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Keeps the local session in sync after a persisted profile change. */
  applyUser(user: ApiUser): void {
    const current = this.user();
    if (!current) return;

    this.updateProfile({
      fullName: user.fullName,
      phone: user.phone,
      online: user.online,
      verified: user.verified,
      workshop: user.workshop,
      city: user.city,
      specialty: user.specialty,
      rating: user.rating,
      totalJobs: user.totalJobs,
      createdAt: user.createdAt,
    });
  }

  updateProfile(changes: Partial<AuthUser>): void {
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
    const role = this.normalizeRole(response.role) ?? fallbackRole;

    const user: AuthUser = {
      id: response.userId,
      fullName: response.fullName || fallbackEmail.split('@')[0],
      email: response.email || fallbackEmail,
      phone: response.phone,
      role,
      online: response.online ?? false,
      verified: response.verified ?? false,
      workshop: response.workshop,
      city: response.city,
      specialty: response.specialty,
      rating: response.rating ?? 0,
      totalJobs: response.totalJobs ?? 0,
      createdAt: response.createdAt,
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
      if ((parsed as AuthUser & { demo?: boolean }).demo) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

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
