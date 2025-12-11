import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface SessionUser {
  id: string;
  username: string;
  role: string;
  departmentId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'sisproyect_session';
  private readonly _user = signal<SessionUser | null>(this.readSession());
  private readonly http = inject(HttpClient);

  constructor(private readonly router: Router) {}

  get user() {
    return this._user();
  }

  isAuthenticated(): boolean {
    return !!this._user();
  }

  login(user: SessionUser) {
    this._user.set(user);
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  logout() {
    this._user.set(null);
    localStorage.removeItem(this.storageKey);
    this.router.navigateByUrl('/login');
  }

  refreshSession() {
    const currentUser = this._user();
    if (!currentUser) return;

    this.http.get<{ user: SessionUser }>(`${environment.apiUrl}/refresh-session/${currentUser.id}`)
      .subscribe({
        next: (response) => {
          this._user.set(response.user);
          localStorage.setItem(this.storageKey, JSON.stringify(response.user));
        },
        error: (err) => console.error('Error refrescando sesión', err)
      });
  }

  private readSession(): SessionUser | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }
}
