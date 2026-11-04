import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AddBikePayload,
  ApiRescueRequest,
  ApiUser,
  Bike,
  CreateRequestPayload,
  PlatformStats,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = 'http://localhost:8080/api';

  constructor(private readonly http: HttpClient) {}

  bikes(riderId: number): Observable<Bike[]> {
    return this.http.get<Bike[]>(`${this.base}/bikes/rider/${riderId}`);
  }

  addBike(payload: AddBikePayload): Observable<Bike> {
    return this.http.post<Bike>(`${this.base}/bikes`, payload);
  }

  removeBike(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/bikes/${id}`);
  }

  makePrimaryBike(id: number): Observable<Bike> {
    return this.http.post<Bike>(`${this.base}/bikes/${id}/primary`, {});
  }

  riderRequests(riderId: number): Observable<ApiRescueRequest[]> {
    return this.http.get<ApiRescueRequest[]>(`${this.base}/requests/rider/${riderId}`);
  }

  openRequests(): Observable<ApiRescueRequest[]> {
    return this.http.get<ApiRescueRequest[]>(`${this.base}/requests/open`);
  }

  mechanicRequests(mechanicId: number): Observable<ApiRescueRequest[]> {
    return this.http.get<ApiRescueRequest[]>(`${this.base}/requests/mechanic/${mechanicId}`);
  }

  allRequests(): Observable<ApiRescueRequest[]> {
    return this.http.get<ApiRescueRequest[]>(`${this.base}/requests`);
  }

  stats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.base}/requests/stats`);
  }

  createRequest(payload: CreateRequestPayload): Observable<ApiRescueRequest> {
    return this.http.post<ApiRescueRequest>(`${this.base}/requests`, payload);
  }

  acceptRequest(id: number, mechanicId: number): Observable<ApiRescueRequest> {
    return this.http.post<ApiRescueRequest>(`${this.base}/requests/${id}/accept`, { mechanicId });
  }

  arriveRequest(id: number, mechanicId: number): Observable<ApiRescueRequest> {
    return this.http.post<ApiRescueRequest>(`${this.base}/requests/${id}/arrive`, { mechanicId });
  }

  completeRequest(id: number, mechanicId: number): Observable<ApiRescueRequest> {
    return this.http.post<ApiRescueRequest>(`${this.base}/requests/${id}/complete`, { mechanicId });
  }

  cancelRequest(id: number, riderId: number): Observable<ApiRescueRequest> {
    return this.http.post<ApiRescueRequest>(`${this.base}/requests/${id}/cancel`, { riderId });
  }

  assignRequest(id: number, mechanicId?: number): Observable<ApiRescueRequest> {
    return this.http.post<ApiRescueRequest>(`${this.base}/requests/${id}/assign`, {
      mechanicId: mechanicId ?? null,
    });
  }

  mechanics(): Observable<ApiUser[]> {
    return this.http.get<ApiUser[]>(`${this.base}/users/mechanics`);
  }

  users(): Observable<ApiUser[]> {
    return this.http.get<ApiUser[]>(`${this.base}/users`);
  }

  updateUser(
    id: number,
    changes: Partial<
      Pick<
        ApiUser,
        'fullName' | 'phone' | 'workshop' | 'city' | 'specialty' | 'serviceRadiusKm'
      >
    >,
  ): Observable<ApiUser> {
    return this.http.put<ApiUser>(`${this.base}/users/${id}`, changes);
  }

  setOnline(id: number, online: boolean): Observable<ApiUser> {
    return this.http.put<ApiUser>(`${this.base}/users/${id}/online`, { online });
  }

  setVerified(id: number, verified: boolean): Observable<ApiUser> {
    return this.http.put<ApiUser>(`${this.base}/users/${id}/verify`, { verified });
  }
}
