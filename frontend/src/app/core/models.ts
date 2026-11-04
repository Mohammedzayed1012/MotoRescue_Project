export type UserRole = 'CUSTOMER' | 'MECHANIC' | 'ADMIN';

export interface AuthUser {
  id?: number;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  online?: boolean;
  verified?: boolean;
  workshop?: string;
  city?: string;
  specialty?: string;
  rating?: number;
  totalJobs?: number;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  userId?: number;
  fullName?: string;
  email?: string;
  role?: string;
  phone?: string;
  online?: boolean;
  verified?: boolean;
  workshop?: string;
  city?: string;
  specialty?: string;
  rating?: number;
  totalJobs?: number;
  createdAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
}

export interface ApiUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  workshop?: string;
  city?: string;
  specialty?: string;
  serviceRadiusKm?: number;
  online: boolean;
  verified: boolean;
  rating: number;
  totalJobs: number;
  createdAt?: string;
}

export interface Bike {
  id: number;
  ownerId: number;
  name: string;
  regNo: string;
  year: string;
  odometer: string;
  primaryBike: boolean;
  createdAt?: string;
}

export type RequestStatus =
  | 'SEARCHING'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ApiRescueRequest {
  id: number;
  reference: string;
  riderId: number;
  riderName?: string;
  riderPhone?: string;
  mechanicId?: number;
  mechanicName?: string;
  mechanicPhone?: string;
  serviceId?: string;
  serviceLabel?: string;
  icon?: string;
  bikeLabel?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  status: RequestStatus;
  quote?: string;
  payout?: number;
  etaMinutes?: number;
  distance?: string;
  createdAt?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface WeeklyPoint {
  day: string;
  count: number;
  value: number;
}

export interface PlatformStats {
  activeRequests: number;
  searching: number;
  inProgress: number;
  completedToday: number;
  revenueToday: number;
  mechanicsTotal: number;
  mechanicsOnline: number;
  ridersTotal: number;
  avgResponseMinutes: number;
  weekly: WeeklyPoint[];
}

export interface CreateRequestPayload {
  riderId: number;
  serviceId: string;
  serviceLabel: string;
  icon: string;
  bikeLabel: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
}

export interface AddBikePayload {
  ownerId: number;
  name: string;
  regNo: string;
  year: string;
  odometer?: string;
}
