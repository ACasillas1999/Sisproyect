import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface SessionUser {
  id: string;
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'sisproyect_session';
  private readonly _user = signal<SessionUser | null>(this.readSession());

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

  private readSession(): SessionUser | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }
}
