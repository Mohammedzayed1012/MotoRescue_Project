import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'MotoRescue — 24/7 Motorcycle Roadside Assistance',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    title: 'Log in — MotoRescue',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Create your account — MotoRescue',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: 'customer',
    title: 'Rider dashboard — MotoRescue',
    canActivate: [authGuard, roleGuard('CUSTOMER')],
    loadComponent: () =>
      import('./pages/customer-dashboard/customer-dashboard').then((m) => m.CustomerDashboard),
  },
  {
    path: 'mechanic',
    title: 'Mechanic workspace — MotoRescue',
    canActivate: [authGuard, roleGuard('MECHANIC')],
    loadComponent: () =>
      import('./pages/mechanic-dashboard/mechanic-dashboard').then((m) => m.MechanicDashboard),
  },
  {
    path: 'admin',
    title: 'Operations console — MotoRescue',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  { path: 'customer-dashboard', redirectTo: 'customer' },
  { path: 'mechanic-dashboard', redirectTo: 'mechanic' },
  { path: 'admin-dashboard', redirectTo: 'admin' },
  { path: '**', redirectTo: '' },
];
