import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export type TaskStatus = 'pending' | 'in-progress' | 'done';

export interface Department {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  start: string;
  end: string;
}

export interface Task {
  id: string;
  projectId: string;
  departmentId: string;
  title: string;
  status: TaskStatus;
  priority: 'alta' | 'media' | 'baja';
  due: string;
  effort: number;
}

export interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  active?: number;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/departments`);
  }

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects`);
  }

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks`);
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  createUser(payload: { username: string; password: string; role: string; active?: number }): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, payload);
  }

  updateUser(id: string, payload: { username?: string; email?: string; password?: string; role?: string; active?: number }) {
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, payload);
  }

  deleteUser(id: string) {
    return this.http.delete<{ id: string }>(`${this.baseUrl}/users/${id}`);
  }

  login(payload: { username: string; password: string }) {
    return this.http.post<{ ok: boolean; user?: User }>(`${this.baseUrl}/login`, payload);
  }
}
