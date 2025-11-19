import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProgressData {
  months: string[];
  intensity: number[];
  averageWeight: number[];
}

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProgressData(userId?: number): Observable<ProgressData> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId.toString());
    }
    return this.http.get<ProgressData>(`${this.apiUrl}/progress`, { params });
  }
}

