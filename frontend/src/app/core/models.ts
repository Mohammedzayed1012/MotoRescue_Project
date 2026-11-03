export type UserRole = 'CUSTOMER' | 'MECHANIC' | 'ADMIN';

export interface AuthUser {
  id?: number;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  demo?: boolean;
}

export interface AuthResponse {
  message: string;
  userId?: number;
  fullName?: string;
  email?: string;
  role?: string;
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

export interface ServiceType {
  id: string;
  label: string;
  icon: string;
  description: string;
  price: string;
}

export interface Mechanic {
  id: string;
  name: string;
  initials: string;
  rating: number;
  jobs: number;
  distance: string;
  specialty: string;
  verified: boolean;
  tone: 'brand' | 'green' | 'blue';
}

export type RequestStatus = 'searching' | 'assigned' | 'en_route' | 'arrived' | 'completed';

export interface RescueRequest {
  id: string;
  service: string;
  icon: string;
  bike: string;
  location: string;
  status: RequestStatus;
  eta: string;
  price: string;
  note?: string;
  mechanic?: Mechanic;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  service: string;
  mechanic: string;
  bike: string;
  amount: string;
  status: 'Completed' | 'Cancelled';
}

export interface Bike {
  id: string;
  name: string;
  regNo: string;
  year: string;
  odometer: string;
  tone: 'brand' | 'green' | 'blue';
}
