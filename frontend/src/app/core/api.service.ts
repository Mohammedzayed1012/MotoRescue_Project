import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AddBikePayload,
  ApiRescueRequest,
  ApiUser,
  Bike,
  CreateRequestPayload,
  OpenSupportThreadPayload,
  PlatformStats,
  SupportMessage,
  SupportSenderRole,
  SupportThread,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = '/api';

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

  /* Rescue desk chat -------------------------------------------------- */

  openSupportThread(payload: OpenSupportThreadPayload): Observable<SupportThread> {
    return this.http.post<SupportThread>(`${this.base}/support/threads`, payload);
  }

  supportThreadForRider(riderId: number): Observable<SupportThread | null> {
    return this.http.get<SupportThread | null>(`${this.base}/support/threads/rider/${riderId}`);
  }

  supportThreads(): Observable<SupportThread[]> {
    return this.http.get<SupportThread[]>(`${this.base}/support/threads`);
  }

  supportMessages(threadId: number): Observable<SupportMessage[]> {
    return this.http.get<SupportMessage[]>(`${this.base}/support/threads/${threadId}/messages`);
  }

  sendSupportMessage(
    threadId: number,
    payload: { senderRole: SupportSenderRole; senderName?: string; body: string },
  ): Observable<SupportMessage> {
    return this.http.post<SupportMessage>(
      `${this.base}/support/threads/${threadId}/messages`,
      payload,
    );
  }

  markSupportRead(threadId: number, role: SupportSenderRole): Observable<SupportThread> {
    return this.http.put<SupportThread>(`${this.base}/support/threads/${threadId}/read`, { role });
  }
}
