import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'completed' | 'cancelled';

export interface Department {
  id: string;
  name: string;
  color: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status?: 'development' | 'production';
  start?: string;
  end?: string;
  logo?: string;
  workspaceId?: string;
  createdAt: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId?: string | null;
  departmentId?: string;
  title: string;
  description?: string;
  assignedTo?: string | null;
  status: TaskStatus;
  priority: 'alta' | 'media' | 'baja';
  due?: string;
  effort: number;
  createdAt?: string; // Fecha en que se creó la tarea
  completedAt?: string | null; // Fecha en que se completó la tarea
  releasedVersionId?: string | null;
  releasedVersionName?: string | null;
  isOwnDepartment?: boolean; // Indica si la tarea pertenece al departamento del usuario
}

export interface User {
  id: string;
  username: string;
  email?: string;
  role: string;
  departmentId?: string;
  createdAt?: string;
  active?: number;
}

export interface DepartmentProgress {
  department: Department;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
  progress: number;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionName: string;
  snapshotData: {
    project: Project;
    tasks: Task[];
    timestamp: string;
  };
  createdBy?: string;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  versionId?: string | null;
  title: string;
  description?: string;
  fileName?: string;
  filePath: string;
  mimeType?: string;
  size?: number;
  createdBy?: string;
  createdAt: string;
  versionName?: string;
  createdByName?: string;
  taskId?: string | null;
  taskTitle?: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  comment: string;
  versionId?: string;
  versionName?: string;
  createdAt: string;
}

export interface TaskDocument {
  id: string;
  taskId: string;
  projectId: string;
  title: string;
  description?: string;
  fileName?: string;
  filePath: string;
  mimeType?: string;
  size?: number;
  createdBy?: string;
  createdByName?: string;
  versionId?: string;
  versionName?: string;
  createdAt: string;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  userId?: string;
  author?: string;
  message: string;
  createdAt: string;
}

export interface VersionSummary {
  id: string;
  projectId: string;
  versionName: string;
  createdBy?: string;
  createdAt: string;
  projectName?: string;
  projectStatus?: string;
  workspaceId?: string;
}

export interface VersionPreview {
  tasks: Array<{id: string; title: string; status: string}>;
  documents: Array<{id: string; title: string; file_name?: string; taskTitle?: string}>;
  comments: Array<{id: string; comment: string; username: string; taskTitle: string}>;
  summary: {
    tasksCount: number;
    documentsCount: number;
    commentsCount: number;
  };
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  public readonly apiUrl = environment.apiUrl;

  // Departments
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/departments`);
  }

  createDepartment(payload: { name: string; color: string }): Observable<Department> {
    return this.http.post<Department>(`${this.apiUrl}/departments`, payload);
  }

  updateDepartment(id: string, payload: { name: string; color: string }): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/departments/${id}`, payload);
  }

  deleteDepartment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/departments/${id}`);
  }

  // Projects
  getProjects(departmentId?: string): Observable<Project[]> {
    const url = departmentId
      ? `${this.apiUrl}/projects?departmentId=${departmentId}`
      : `${this.apiUrl}/projects`;
    return this.http.get<Project[]>(url);
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/projects/${id}`);
  }

  getProjectStats(id: string): Observable<{ total: number; completed: number }> {
    return this.http.get<{ total: number; completed: number }>(`${this.apiUrl}/projects/${id}/stats`);
  }

  getProjectDocuments(projectId: string): Observable<ProjectDocument[]> {
    return this.http.get<ProjectDocument[]>(`${this.apiUrl}/projects/${projectId}/documents`);
  }

  uploadProjectDocument(projectId: string, formData: FormData): Observable<ProjectDocument> {
    return this.http.post<ProjectDocument>(`${this.apiUrl}/projects/${projectId}/documents`, formData);
  }

  // Project Comments
  getProjectComments(projectId: string): Observable<ProjectComment[]> {
    return this.http.get<ProjectComment[]>(`${this.apiUrl}/projects/${projectId}/comments`);
  }

  createProjectComment(projectId: string, payload: { userId?: string; message: string }): Observable<ProjectComment> {
    return this.http.post<ProjectComment>(`${this.apiUrl}/projects/${projectId}/comments`, payload);
  }

  // Task Comments
  getTaskComments(taskId: string): Observable<TaskComment[]> {
    return this.http.get<TaskComment[]>(`${this.apiUrl}/tasks/${taskId}/comments`);
  }

  createTaskComment(taskId: string, userId: string, comment: string): Observable<TaskComment> {
    return this.http.post<TaskComment>(`${this.apiUrl}/tasks/${taskId}/comments`, { userId, comment });
  }

  // Task Documents
  getTaskDocuments(taskId: string): Observable<TaskDocument[]> {
    return this.http.get<TaskDocument[]>(`${this.apiUrl}/tasks/${taskId}/documents`);
  }

  uploadTaskDocument(taskId: string, formData: FormData): Observable<TaskDocument> {
    return this.http.post<TaskDocument>(`${this.apiUrl}/tasks/${taskId}/documents`, formData);
  }

  createProject(payload: FormData | any): Observable<Project> {
    return this.http.post<Project>(`${this.apiUrl}/projects`, payload);
  }

  updateProject(id: string, payload: FormData | { name?: string; description?: string; status?: 'development' | 'production'; start?: string; end?: string }): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/projects/${id}`, payload);
  }

  // Workspaces
  getWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${this.apiUrl}/workspaces`);
  }

  getWorkspace(id: string): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.apiUrl}/workspaces/${id}`);
  }

  createWorkspace(payload: { name: string; description?: string; color?: string; icon?: string }): Observable<Workspace> {
    return this.http.post<Workspace>(`${this.apiUrl}/workspaces`, payload);
  }

  updateWorkspace(id: string, payload: { name?: string; description?: string; color?: string; icon?: string }): Observable<Workspace> {
    return this.http.put<Workspace>(`${this.apiUrl}/workspaces/${id}`, payload);
  }

  deleteWorkspace(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/workspaces/${id}`);
  }

  getWorkspaceProjects(workspaceId: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/workspaces/${workspaceId}/projects`);
  }

  // Tasks
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/tasks`);
  }

  getProjectTasks(projectId: string, departmentId?: string): Observable<Task[]> {
    const url = departmentId
      ? `${this.apiUrl}/projects/${projectId}/tasks?departmentId=${departmentId}`
      : `${this.apiUrl}/projects/${projectId}/tasks`;
    return this.http.get<Task[]>(url);
  }

  getSubtasks(taskId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/tasks/${taskId}/subtasks`);
  }

  createTask(payload: {
    projectId: string;
    parentTaskId?: string;
    title: string;
    description?: string;
    assignedTo?: string;
    status?: TaskStatus;
    priority?: string;
    due?: string;
    effort?: number;
    departmentId?: string;
  }): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/tasks`, payload);
  }

  updateTask(id: string, payload: {
    title?: string;
    description?: string;
    assignedTo?: string;
    status?: TaskStatus;
    priority?: string;
    due?: string;
    effort?: number;
    departmentId?: string;
  }): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/tasks/${id}`, payload);
  }

  deleteTask(id: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(`${this.apiUrl}/tasks/${id}`);
  }

  // Progress
  getProjectProgress(projectId: string): Observable<DepartmentProgress[]> {
    return this.http.get<DepartmentProgress[]>(`${this.apiUrl}/projects/${projectId}/progress`);
  }

  // Versions
  getProjectVersions(projectId: string): Observable<ProjectVersion[]> {
    return this.http.get<ProjectVersion[]>(`${this.apiUrl}/projects/${projectId}/versions`);
  }

  getVersionPreview(projectId: string): Observable<VersionPreview> {
    return this.http.get<VersionPreview>(`${this.apiUrl}/projects/${projectId}/version-preview`);
  }

  createProjectVersion(projectId: string, payload: { versionName: string; createdBy?: string }): Observable<ProjectVersion> {
    return this.http.post<ProjectVersion>(`${this.apiUrl}/projects/${projectId}/versions`, payload);
  }

  getAllVersions(): Observable<VersionSummary[]> {
    return this.http.get<VersionSummary[]>(`${this.apiUrl}/versions`);
  }

  getVersionDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/versions/${id}`);
  }

  // Users
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  createUser(payload: { username: string; password: string; role: string; departmentId?: string; active?: number }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, payload);
  }

  updateUser(id: string, payload: { username?: string; email?: string; password?: string; role?: string; departmentId?: string; active?: number }): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, payload);
  }

  deleteUser(id: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(`${this.apiUrl}/users/${id}`);
  }

  // Auth
  login(payload: { username: string; password: string }): Observable<{ ok: boolean; user?: User }> {
    return this.http.post<{ ok: boolean; user?: User }>(`${this.apiUrl}/login`, payload);
  }
}
