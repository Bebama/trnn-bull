import { Injectable } from '@angular/core';

export interface AppUser {
  id: string;
  usuario: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento?: string;
  email: string;
  telefono: string;
  emergenciaNombre: string;
  emergenciaTelefono: string;
  nivel: string;
  rol: 'atleta' | 'entrenador' | 'superusuario';
  status: 'pendiente' | 'valido' | 'rechazado';
  emailVerified: boolean;
  rms?: Record<string, number | null>;
  logros?: Logro[];
  createdAt?: string;
}

export interface Logro {
  id: string;
  nombre: string;
  descripcion?: string;
  fecha?: string;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly tokenKey = 'trnn_token';
  private readonly userKey = 'trnn_user';

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): AppUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppUser;
    } catch {
      return null;
    }
  }

  setSession(token: string, user: AppUser): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  updateUser(user: AppUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  clear(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isStaff(): boolean {
    const u = this.getUser();
    return !!u && (u.rol === 'entrenador' || u.rol === 'superusuario');
  }

  isSuper(): boolean {
    return this.getUser()?.rol === 'superusuario';
  }

  displayName(): string {
    const u = this.getUser();
    if (!u) return '';
    return `${u.nombre} ${u.apellidos}`.trim() || u.usuario;
  }
}
