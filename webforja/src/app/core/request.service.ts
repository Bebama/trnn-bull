import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SessionService, AppUser, Logro } from './session.service';

export const LIFT_LABELS: Record<string, string> = {
  backSquat: 'Back squat',
  frontSquat: 'Front squat',
  overheadSquat: 'Overhead squat',
  deadlift: 'Deadlift',
  clean: 'Clean',
  snatch: 'Snatch',
  cleanAndJerk: 'Clean & jerk',
  benchPress: 'Bench press',
  strictPress: 'Strict press',
  pushPress: 'Push press',
  thruster: 'Thruster',
};

export const RM_PERCENTS = [50, 60, 65, 70, 75, 80, 85, 90, 95];

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  // Local: API en :4032. Público (túnel / same-origin): base vacía.
  private conexionURL = RequestService.resolveBaseUrl();

  constructor(private http: HttpClient, private session: SessionService) {}

  private static resolveBaseUrl(): string {
    if (typeof window === 'undefined' || !window.location) {
      return 'http://127.0.0.1:4032/';
    }
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:4032/';
    }
    return '';
  }

  private authHeaders(): HttpHeaders {
    const token = this.session.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', 'Bearer ' + token);
    }
    return headers;
  }

  getStatus(): Observable<string> {
    return this.http.get(this.conexionURL + 'status', { responseType: 'text' });
  }

  postLogin(usuario: string, password: string): Observable<any> {
    return this.http.post<any>(
      this.conexionURL + 'auth',
      JSON.stringify({ usuario, password }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  postLogout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      this.conexionURL + 'logout',
      {},
      { headers: this.authHeaders() }
    );
  }

  postRegister(payload: Record<string, unknown>): Observable<any> {
    return this.http.post<any>(
      this.conexionURL + 'register',
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  postVerifyEmail(email: string, code: string): Observable<any> {
    return this.http.post<any>(
      this.conexionURL + 'verify-email',
      JSON.stringify({ email, code }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  getMe(): Observable<{ user: AppUser }> {
    return this.http.get<{ user: AppUser }>(this.conexionURL + 'me', {
      headers: this.authHeaders(),
    });
  }

  putMe(payload: Record<string, unknown>): Observable<{ ok: boolean; user: AppUser }> {
    return this.http.put<{ ok: boolean; user: AppUser }>(
      this.conexionURL + 'me',
      JSON.stringify(payload),
      { headers: this.authHeaders() }
    );
  }

  getPendingUsers(): Observable<{ users: AppUser[] }> {
    return this.http.get<{ users: AppUser[] }>(this.conexionURL + 'users/pending', {
      headers: this.authHeaders(),
    });
  }

  getAthletes(): Observable<{ users: AppUser[] }> {
    return this.http.get<{ users: AppUser[] }>(this.conexionURL + 'users/athletes', {
      headers: this.authHeaders(),
    });
  }

  approveUser(id: string): Observable<any> {
    return this.http.post<any>(
      this.conexionURL + 'users/' + id + '/approve',
      {},
      { headers: this.authHeaders() }
    );
  }

  rejectUser(id: string): Observable<any> {
    return this.http.post<any>(
      this.conexionURL + 'users/' + id + '/reject',
      {},
      { headers: this.authHeaders() }
    );
  }

  createCoach(payload: Record<string, unknown>): Observable<any> {
    return this.http.post<any>(
      this.conexionURL + 'coaches',
      JSON.stringify(payload),
      { headers: this.authHeaders() }
    );
  }

  getLogros(userId?: string): Observable<{ userId: string; logros: Logro[] }> {
    const q = userId ? '?userId=' + encodeURIComponent(userId) : '';
    return this.http.get<{ userId: string; logros: Logro[] }>(
      this.conexionURL + 'logros' + q,
      { headers: this.authHeaders() }
    );
  }

  addLogro(payload: {
    userId: string;
    nombre: string;
    descripcion?: string;
    fecha?: string;
  }): Observable<any> {
    return this.http.post<any>(
      this.conexionURL + 'logros',
      JSON.stringify(payload),
      { headers: this.authHeaders() }
    );
  }

  deleteLogro(logroId: string, userId: string): Observable<any> {
    return this.http.delete<any>(
      this.conexionURL +
        'logros/' +
        encodeURIComponent(logroId) +
        '?userId=' +
        encodeURIComponent(userId),
      { headers: this.authHeaders() }
    );
  }

  getRm(userId?: string): Observable<{
    userId: string;
    rms: Record<string, number | null>;
    lifts: string[];
  }> {
    const q = userId ? '?userId=' + encodeURIComponent(userId) : '';
    return this.http.get<{
      userId: string;
      rms: Record<string, number | null>;
      lifts: string[];
    }>(this.conexionURL + 'rm' + q, { headers: this.authHeaders() });
  }

  putRm(rms: Record<string, number | null>, userId?: string): Observable<any> {
    const body: Record<string, unknown> = { rms };
    if (userId) body['userId'] = userId;
    return this.http.put<any>(this.conexionURL + 'rm', JSON.stringify(body), {
      headers: this.authHeaders(),
    });
  }

  getCalendar(year: number, month: number): Observable<{
    workouts: Record<string, { title: string; description: string }>;
    year: number;
    month: number;
  }> {
    return this.http.get<{
      workouts: Record<string, { title: string; description: string }>;
      year: number;
      month: number;
    }>(this.conexionURL + `calendar?year=${year}&month=${month}`, {
      headers: this.authHeaders(),
    });
  }

  getCalendarDay(date: string): Observable<{
    date: string;
    workout: { title: string; description: string } | null;
  }> {
    return this.http.get<{
      date: string;
      workout: { title: string; description: string } | null;
    }>(this.conexionURL + 'calendar/' + date, { headers: this.authHeaders() });
  }

  putCalendarDay(
    date: string,
    title: string,
    description: string
  ): Observable<any> {
    return this.http.put<any>(
      this.conexionURL + 'calendar/' + date,
      JSON.stringify({ title, description }),
      { headers: this.authHeaders() }
    );
  }
}
