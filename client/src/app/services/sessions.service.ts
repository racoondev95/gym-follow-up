import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Session {
  id: number;
  userId: number;
  name?: string;
  sessionDate: string;
  createdAt: string;
  updatedAt: string;
  exerciseCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SessionsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/sessions`);
  }

  getSession(id: number): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/sessions/${id}`);
  }

  getSessionWithExercises(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sessions/${id}/with-exercises`);
  }

  createSession(session: { userId?: number; name?: string; sessionDate: string; exercises?: any[] }): Observable<Session> {
    return this.http.post<Session>(`${this.apiUrl}/sessions`, session);
  }

  updateSession(id: number, session: { name?: string; sessionDate: string; exercises?: any[] }): Observable<Session> {
    return this.http.put<Session>(`${this.apiUrl}/sessions/${id}`, session);
  }

  deleteSession(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sessions/${id}`);
  }
}

