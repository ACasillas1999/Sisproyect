import { Component, computed, inject, signal, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../auth.service';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../../environments/environment';
import {
  DataService,
  Project,
  Task,
  User,
  Department,
  DepartmentProgress,
  ProjectDocument,
  ProjectVersion,
  Workspace,
  ProjectComment,
} from '../../data.service';

import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { FilePreviewComponent } from '../../components/file-preview/file-preview.component';
import { ProjectCommentsPanelComponent } from '../../components/project-comments-panel/project-comments-panel.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent, SpinnerComponent, PaginationComponent, FilePreviewComponent, ProjectCommentsPanelComponent],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent {
  private readonly dataService = inject(DataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);

  protected showReportPreview = signal(false);
  protected reportHtmlContent = signal<SafeHtml>('');

  protected readonly projectId = signal<string>('');
  protected readonly project = signal<Project | null>(null);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly departments = signal<Department[]>([]);
  protected readonly progress = signal<DepartmentProgress[]>([]);
  protected readonly versions = signal<ProjectVersion[]>([]);
  protected readonly documents = signal<ProjectDocument[]>([]);
  protected readonly workspaces = signal<Workspace[]>([]);

  protected readonly showCreateTaskModal = signal(false);
  protected readonly showCreateVersionModal = signal(false);
  protected readonly showUploadDocumentModal = signal(false);
  protected readonly showTaskDetailModal = signal(false);
  protected readonly editingTask = signal<Task | null>(null);
  protected readonly selectedTask = signal<Task | null>(null);
  protected readonly taskComments = signal<any[]>([]);
  protected readonly taskDocuments = signal<any[]>([]);
  protected readonly newComment = signal('');
  protected readonly expandedTasks = signal<Set<string>>(new Set());
  protected readonly hideCompletedTasks = signal(false);
  protected readonly activeTaskTab = signal<'comments' | 'documents'>('comments');
  protected readonly selectedVersionFilter = signal<string | null>(null);
  protected readonly isProjectCommentsPanelOpen = signal(false);
  protected readonly projectComments = signal<ProjectComment[]>([]);
  protected readonly projectCommentsLoading = signal(false);
  protected readonly projectCommentDraft = signal('');
  protected readonly isSavingProjectComment = signal(false);

  // Loading states
  protected readonly isLoadingProject = signal(false);
  protected readonly isCreatingTask = signal(false);
  protected readonly isCreatingVersion = signal(false);
  protected readonly isUploadingDocument = signal(false);
  protected readonly isAddingComment = signal(false);
  protected readonly isExportingReport = signal(false);

  // Paginación de comentarios
  protected readonly commentsPage = signal(1);
  protected readonly commentsPerPage = 5;

  protected readonly paginatedComments = computed(() => {
    const comments = this.taskComments();
    const page = this.commentsPage();
    const start = (page - 1) * this.commentsPerPage;
    const end = start + this.commentsPerPage;
    return comments.slice(start, end);
  });

  // File Preview
  protected readonly showFilePreview = signal(false);
  protected readonly previewFile = signal<{ url: string, name: string, type: string } | null>(null);

  protected readonly newTask = signal({
    title: '',
    description: '',
    departmentId: '',
    priority: 'media',
    due: '',
    parentTaskId: null as string | null,
  });

  protected readonly newVersion = signal({
    versionName: '',
  });

  protected readonly versionPreview = signal<any | null>(null);

  protected readonly newDocument = signal<{
    title: string;
    description: string;
    versionId: string;
    file: File | null;
  }>({
    title: '',
    description: '',
    versionId: '',
    file: null,
  });

  constructor() {
    // Refrescar la sesión para obtener el departmentId actualizado
    this.auth.refreshSession();

    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.projectId.set(id);
        this.loadProject();
        this.loadTasks();
        this.loadUsers();
        this.loadDepartments();
        this.loadProgress();
        this.loadVersions();
        this.loadDocuments();
      }
    });
    this.loadWorkspaces();
  }

  private loadWorkspaces() {
    this.dataService.getWorkspaces().subscribe({
      next: (workspaces) => this.workspaces.set(workspaces),
      error: (err) => console.error('Error loading workspaces', err)
    });
  }

  private loadProject() {
    this.dataService.getProject(this.projectId()).subscribe({
      next: (project) => this.project.set(project),
      error: (err) => console.error('Error loading project', err),
    });
  }

  private loadTasks() {
    const currentUser = this.auth.user;
    // Si el usuario no es admin, filtrar por su departamento
    const departmentId = (currentUser?.role !== 'admin') ? currentUser?.departmentId : undefined;

    this.dataService.getProjectTasks(this.projectId(), departmentId).subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: (err) => console.error('Error loading tasks', err),
    });
  }

  private loadUsers() {
    this.dataService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (err) => console.error('Error loading users', err),
    });
  }

  private loadDepartments() {
    this.dataService.getDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: (err) => console.error('Error loading departments', err),
    });
  }

  private loadProgress() {
    this.dataService.getProjectProgress(this.projectId()).subscribe({
      next: (progress) => this.progress.set(progress),
      error: (err) => console.error('Error loading progress', err),
    });
  }

  private loadVersions() {
    this.dataService.getProjectVersions(this.projectId()).subscribe({
      next: (versions) => this.versions.set(versions),
      error: (err) => console.error('Error loading versions', err),
    });
  }

  private loadDocuments() {
    this.dataService.getProjectDocuments(this.projectId()).subscribe({
      next: (docs) => this.documents.set(docs),
      error: (err) => console.error('Error loading documents', err),
    });
  }

  protected readonly taskTree = computed(() => {
    let allTasks = this.tasks();

    // Filtrar por versión seleccionada
    const versionFilter = this.selectedVersionFilter();
    if (versionFilter === null) {
      // Mostrar solo tareas NO versionadas (trabajo actual)
      allTasks = allTasks.filter((t) => !t.releasedVersionId);
    } else if (versionFilter !== 'all') {
      // Mostrar solo tareas de la versión seleccionada
      allTasks = allTasks.filter((t) => t.releasedVersionId === versionFilter);
    }
    // Si versionFilter === 'all', mostrar todas las tareas

    // Filtrar tareas completadas si está activado
    if (this.hideCompletedTasks()) {
      allTasks = allTasks.filter((t) => t.status !== 'completed');
    }

    const rootTasks = allTasks.filter((t) => !t.parentTaskId);
    return rootTasks.map((task) => this.buildTaskTree(task, allTasks));
  });

  protected readonly activeDepartments = computed(() => {
    return this.progress().filter(dept => dept.total > 0);
  });

  protected readonly filteredDocuments = computed(() => {
    const allDocs = this.documents();
    const versionFilter = this.selectedVersionFilter();

    if (versionFilter === null) {
      // Mostrar solo documentos NO versionados (trabajo actual)
      return allDocs.filter((d) => !d.versionId);
    } else if (versionFilter !== 'all') {
      // Mostrar solo documentos de la versión seleccionada
      return allDocs.filter((d) => d.versionId === versionFilter);
    }
    // Si versionFilter === 'all', mostrar todos los documentos
    return allDocs;
  });

  private buildTaskTree(task: Task, allTasks: Task[]): TaskNode {
    const children = allTasks
      .filter((t) => t.parentTaskId === task.id)
      .map((child) => this.buildTaskTree(child, allTasks));
    return { task, children };
  }

  protected toggleTask(taskId: string) {
    const expanded = this.expandedTasks();
    if (expanded.has(taskId)) {
      expanded.delete(taskId);
    } else {
      expanded.add(taskId);
    }
    this.expandedTasks.set(new Set(expanded));
  }

  protected isExpanded(taskId: string): boolean {
    return this.expandedTasks().has(taskId);
  }

  protected toggleHideCompletedTasks() {
    this.hideCompletedTasks.update(value => !value);
  }

  protected setVersionFilter(versionId: string | null) {
    this.selectedVersionFilter.set(versionId);
  }

  protected getVersionFilterLabel(): string {
    const filter = this.selectedVersionFilter();
    if (filter === null) {
      return 'Trabajo Actual (Sin Versionar)';
    } else if (filter === 'all') {
      return 'Todas las Versiones';
    } else {
      const version = this.versions().find(v => v.id === filter);
      return version?.versionName || 'Versión Seleccionada';
    }
  }

  protected canManageProject(): boolean {
    const user = this.auth.user;
    return user?.role === 'admin' || user?.role === 'lider';
  }

  protected openCreateTaskModal(parentTaskId: string | null = null) {
    this.newTask.set({
      title: '',
      description: '',
      departmentId: '',
      priority: 'media',
      due: '',
      parentTaskId,
    });
    this.showCreateTaskModal.set(true);
  }

  protected createTask() {
    const task = this.newTask();
    if (!task.title || !task.departmentId) {
      this.notifications.warning('Título y departamento son requeridos');
      return;
    }

    this.isCreatingTask.set(true);
    this.dataService
      .createTask({
        projectId: this.projectId(),
        parentTaskId: task.parentTaskId || undefined,
        title: task.title,
        description: task.description,
        departmentId: task.departmentId,
        priority: task.priority,
        due: task.due || undefined,
        status: 'pending',
      })
      .subscribe({
        next: () => {
          this.isCreatingTask.set(false);
          this.notifications.success('Tarea creada correctamente');
          this.loadTasks();
          this.loadProgress();
          this.showCreateTaskModal.set(false);
        },
        error: (err) => {
          this.isCreatingTask.set(false);
          console.error('Error creating task', err);
          this.notifications.error('Error al crear la tarea');
        },
      });
  }

  protected updateTaskStatus(taskId: string, status: string) {
    const task = this.tasks().find((t) => t.id === taskId);
    if (!task || !this.canManageStatus(task)) {
      this.notifications.warning('Solo el usuario asignado puede cambiar el estado de la tarea');
      return;
    }

    this.dataService.updateTask(taskId, { status: status as any }).subscribe({
      next: () => {
        const statusText = status === 'completed' ? 'completada' :
          status === 'in-progress' ? 'en progreso' :
            status === 'cancelled' ? 'cancelada' : 'pendiente';
        this.notifications.success(`Tarea marcada como ${statusText}`);
        this.loadTasks();
        this.loadProgress();
      },
      error: (err) => {
        console.error('Error updating task', err);
        this.notifications.error('Error al actualizar el estado de la tarea');
      },
    });
  }

  protected deleteTask(taskId: string) {
    if (!confirm('¿Eliminar esta tarea y todas sus subtareas?')) return;

    this.dataService.deleteTask(taskId).subscribe({
      next: () => {
        this.notifications.success('Tarea eliminada correctamente');
        this.loadTasks();
        this.loadProgress();
      },
      error: (err) => {
        console.error('Error deleting task', err);
        this.notifications.error('Error al eliminar la tarea');
      },
    });
  }

  protected openCreateVersionModal() {
    this.newVersion.set({ versionName: '' });
    this.loadVersionPreview();
    this.showCreateVersionModal.set(true);
  }

  private loadVersionPreview() {
    this.dataService.getVersionPreview(this.projectId()).subscribe({
      next: (preview) => this.versionPreview.set(preview),
      error: (err) => console.error('Error loading version preview', err)
    });
  }

  protected createVersion() {
    const version = this.newVersion();
    if (!version.versionName) {
      this.notifications.warning('El nombre de la versión es requerido');
      return;
    }

    this.isCreatingVersion.set(true);
    this.dataService
      .createProjectVersion(this.projectId(), {
        versionName: version.versionName,
        createdBy: this.auth.user?.id
      })
      .subscribe({
        next: () => {
          this.isCreatingVersion.set(false);
          this.showCreateVersionModal.set(false);
          this.loadVersions();
          this.loadTasks(); // Reload tasks to see updated releasedVersionId
          this.notifications.success('Versión creada exitosamente');
        },
        error: (err) => {
          this.isCreatingVersion.set(false);
          console.error('Error creating version', err);
          this.notifications.error(err.error?.message || 'Error creando versión');
        },
      });
  }

  protected getUserName(userId: string | null | undefined): string {
    if (!userId) return 'Sin asignar';
    const user = this.users().find((u) => u.id === userId);
    return user?.username || 'Desconocido';
  }

  protected getUserDepartmentName(userId: string | null | undefined): string {
    if (!userId) return '';
    const user = this.users().find((u) => u.id === userId);
    if (!user?.departmentId) return '';
    return this.getDepartmentName(user.departmentId) || '';
  }

  protected getUserDepartmentColor(userId: string | null | undefined): string {
    if (!userId) return '#666';
    const user = this.users().find((u) => u.id === userId);
    if (!user?.departmentId) return '#666';
    return this.getDepartmentColor(user.departmentId);
  }

  protected getDepartmentName(deptId: string | null | undefined): string {
    if (!deptId) return '';
    const dept = this.departments().find((d) => d.id === deptId);
    return dept?.name || '';
  }

  protected getDepartmentColor(deptId: string | null | undefined): string {
    if (!deptId) return '#666';
    const dept = this.departments().find((d) => d.id === deptId);
    return dept?.color || '#666';
  }

  protected getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      'in-progress': 'En Progreso',
      completed: 'Completada',
      done: 'Completada',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  }

  protected goToVersionHistory() {
    this.router.navigate(['/projects', this.projectId(), 'versions']);
  }

  protected canTakeTask(task: Task): boolean {
    const currentUser = this.auth.user;
    if (!currentUser) return false;
    if (task.assignedTo) return false; // Ya está asignada
    if (!task.departmentId) return false; // Sin departamento

    // Verificar que el usuario pertenezca al departamento de la tarea
    return currentUser.departmentId === task.departmentId;
  }

  protected takeTask(taskId: string) {
    const currentUser = this.auth.user;
    const task = this.tasks().find((t) => t.id === taskId);

    if (!currentUser) {
      this.notifications.error('No hay usuario actual');
      return;
    }

    if (!task) {
      this.notifications.error('Tarea no encontrada');
      return;
    }

    if (!this.canTakeTask(task)) {
      this.notifications.warning('Solo usuarios del departamento ' + this.getDepartmentName(task.departmentId) + ' pueden tomar esta tarea');
      return;
    }

    this.dataService.updateTask(taskId, {
      assignedTo: currentUser.id,
      status: 'in-progress'
    }).subscribe({
      next: () => {
        this.notifications.success('Tarea asignada correctamente');
        this.loadTasks();
        this.loadProgress();
      },
      error: (err) => {
        console.error('Error taking task', err);
        this.notifications.error('Error al tomar la tarea');
      },
    });
  }

  protected canManageStatus(task: Task): boolean {
    const currentUser = this.auth.user;
    if (!currentUser) return false;
    if (!task.assignedTo) return false;
    return task.assignedTo === currentUser.id;
  }

  protected openTaskDetail(task: Task) {
    this.selectedTask.set(task);
    this.activeTaskTab.set('comments');
    this.loadTaskComments(task.id);
    this.loadTaskDocuments(task.id);
    this.showTaskDetailModal.set(true);
    this.commentsPage.set(1); // Reset pagination
  }

  protected onCommentsPageChange(page: number): void {
    this.commentsPage.set(page);
  }

  protected switchTaskTab(tab: 'comments' | 'documents') {
    this.activeTaskTab.set(tab);
  }

  private loadTaskComments(taskId: string) {
    this.dataService.getTaskComments(taskId).subscribe({
      next: (comments) => this.taskComments.set(comments),
      error: (err) => console.error('Error loading comments', err)
    });
  }

  private loadTaskDocuments(taskId: string) {
    this.dataService.getTaskDocuments(taskId).subscribe({
      next: (docs) => this.taskDocuments.set(docs),
      error: (err) => console.error('Error loading documents', err)
    });
  }

  protected addComment() {
    const currentUser = this.auth.user;
    const task = this.selectedTask();
    const comment = this.newComment().trim();

    if (!currentUser || !task || !comment) return;

    this.dataService.createTaskComment(task.id, currentUser.id, comment).subscribe({
      next: (newComment) => {
        this.taskComments.update(comments => [...comments, newComment]);
        this.newComment.set('');
      },
      error: (err) => console.error('Error adding comment', err)
    });
  }

  protected openProjectCommentsPanel() {
    const project = this.project();
    if (!project) return;
    this.isProjectCommentsPanelOpen.set(true);
    this.projectCommentDraft.set('');
    if (this.projectComments().length === 0 && !this.projectCommentsLoading()) {
      this.loadProjectComments(project.id);
    }
  }

  protected closeProjectCommentsPanel() {
    this.isProjectCommentsPanelOpen.set(false);
    this.projectCommentDraft.set('');
  }

  private loadProjectComments(projectId: string) {
    this.projectCommentsLoading.set(true);
    this.dataService.getProjectComments(projectId).subscribe({
      next: (comments) => this.projectComments.set(this.dedupeComments(comments.map(c => this.normalizeProjectComment(c, c.message)))),
      error: (err) => console.error('Error loading project comments', err),
      complete: () => this.projectCommentsLoading.set(false),
    });
  }

  protected addProjectComment() {
    const project = this.project();
    const message = this.projectCommentDraft().trim();
    if (!project || !message) return;

    const payload: { userId?: string; message: string } = { message };
    const userId = this.auth.user?.id;
    if (userId) payload.userId = userId;

    this.isSavingProjectComment.set(true);
    this.dataService.createProjectComment(project.id, payload).subscribe({
      next: (comment) => {
        this.projectCommentDraft.set('');
        this.loadProjectComments(project.id);
      },
      error: (err) => console.error('Error adding project comment', err),
      complete: () => this.isSavingProjectComment.set(false),
    });
  }

  private normalizeProjectComment(comment: ProjectComment, fallbackMessage: string): ProjectComment {
    return {
      id: comment.id,
      projectId: comment.projectId,
      userId: comment.userId,
      author: comment.author || this.auth.user?.username || 'Anónimo',
      message: (comment as any).message ?? (comment as any).comment ?? fallbackMessage,
      createdAt: comment.createdAt || new Date().toISOString(),
    };
  }

  private dedupeComments(comments: ProjectComment[]): ProjectComment[] {
    const seen = new Map<string, ProjectComment>();
    for (const c of comments) {
      const key = c.id || `${c.projectId}|${c.author}|${c.message}|${c.createdAt}`;
      if (!seen.has(key)) {
        seen.set(key, c);
      }
    }
    return Array.from(seen.values());
  }

  protected readonly newTaskDocument = signal<{
    title: string;
    description: string;
    file: File | null;
  }>({
    title: '',
    description: '',
    file: null,
  });

  protected onTaskDocumentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.newTaskDocument.update((prev) => ({ ...prev, file }));
  }

  protected uploadTaskDocument() {
    const currentUser = this.auth.user;
    const task = this.selectedTask();
    const doc = this.newTaskDocument();

    if (!currentUser || !task || !doc.title || !doc.file) {
      alert('Título y archivo son requeridos');
      return;
    }

    const formData = new FormData();
    formData.append('projectId', this.projectId());
    formData.append('title', doc.title);
    formData.append('description', doc.description || '');
    formData.append('createdBy', currentUser.id);
    formData.append('file', doc.file);

    this.dataService.uploadTaskDocument(task.id, formData).subscribe({
      next: (newDoc) => {
        this.taskDocuments.update(docs => [...docs, newDoc]);
        this.newTaskDocument.set({ title: '', description: '', file: null });
        this.loadDocuments(); // Refresh project documents
      },
      error: (err) => console.error('Error uploading task document', err)
    });
  }

  protected changeProjectStatus(newStatus: 'development' | 'production') {
    const confirmMsg = newStatus === 'production'
      ? '¿Marcar este proyecto como Producción? Esto indica que el proyecto está funcional y con cambios activos.'
      : '¿Volver este proyecto a Desarrollo? Esto indica que el proyecto aún está en construcción.';

    if (!confirm(confirmMsg)) return;

    this.dataService.updateProject(this.projectId(), { status: newStatus }).subscribe({
      next: () => {
        this.loadProject();
        alert(`Proyecto cambiado a ${newStatus === 'production' ? 'Producción' : 'Desarrollo'}`);
      },
      error: (err) => console.error('Error updating project status', err),
    });
  }

  protected getProjectStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      development: 'En Desarrollo',
      production: 'Producción',
    };
    return labels[status] || status;
  }

  protected getLogoUrl(logoPath: string): string {
    return `${this.dataService.apiUrl.replace('/api', '')}${logoPath}`;
  }
  protected openUploadDocumentModal() {
    this.newDocument.set({ title: '', description: '', versionId: '', file: null });
    this.showUploadDocumentModal.set(true);
  }

  protected onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.newDocument.update((prev) => ({ ...prev, file }));
  }

  protected uploadDocument() {
    const doc = this.newDocument();
    if (!doc.title || !doc.file) {
      this.notifications.warning('Título y archivo son requeridos');
      return;
    }
    const currentUser = this.auth.user;
    const formData = new FormData();
    formData.append('title', doc.title);
    formData.append('description', doc.description || '');
    if (doc.versionId) formData.append('versionId', doc.versionId);
    if (currentUser?.id) formData.append('createdBy', currentUser.id);
    formData.append('file', doc.file);

    this.isUploadingDocument.set(true);
    this.dataService.uploadProjectDocument(this.projectId(), formData).subscribe({
      next: () => {
        this.isUploadingDocument.set(false);
        this.newDocument.set({ title: '', description: '', versionId: '', file: null });
        this.showUploadDocumentModal.set(false);
        this.loadDocuments();
        this.notifications.success('Documento subido correctamente');
      },
      error: (err) => {
        this.isUploadingDocument.set(false);
        console.error('Error uploading document', err);
        this.notifications.error('Error al subir el documento');
      },
    });
  }

  protected buildFileUrl(filePath: string): string {
    const apiBase = environment.apiUrl.replace(/\/api$/, '');
    return `${apiBase}${filePath}`;
  }

  protected openFilePreview(filePath: string, fileName: string): void {
    const url = this.buildFileUrl(filePath);
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Determinar el tipo MIME basado en la extensión
    let fileType = '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
      fileType = `image/${extension}`;
    } else if (extension === 'pdf') {
      fileType = 'application/pdf';
    }

    this.previewFile.set({ url, name: fileName, type: fileType });
    this.showFilePreview.set(true);
  }

  protected closeFilePreview(): void {
    this.showFilePreview.set(false);
    this.previewFile.set(null);
  }

  // Edit Project Logic
  protected readonly showEditProjectModal = signal(false);
  protected readonly editProjectData = signal({
    name: '',
    description: '',
    status: 'development',
    start: '',
    end: '',
    workspaceId: '',
  });
  protected selectedLogo: File | null = null;
  protected logoPreview = signal<string | null>(null);

  protected openEditProjectModal() {
    const p = this.project();
    if (!p) return;

    this.editProjectData.set({
      name: p.name,
      description: p.description,
      status: p.status || 'development',
      start: p.start || '',
      end: p.end || '',
      workspaceId: p.workspaceId || '',
    });
    this.selectedLogo = null;
    this.logoPreview.set(p.logo ? this.getLogoUrl(p.logo) : null);
    this.showEditProjectModal.set(true);
  }

  protected onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedLogo = input.files[0];

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(this.selectedLogo);
    }
  }

  protected updateProjectDetails() {
    const data = this.editProjectData();
    if (!data.name) return;

    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('status', data.status);
    if (data.start) formData.append('start', data.start);
    if (data.end) formData.append('end', data.end);
    if (data.workspaceId) formData.append('workspaceId', data.workspaceId);

    if (this.selectedLogo) {
      formData.append('logo', this.selectedLogo);
    }

    this.dataService.updateProject(this.projectId(), formData).subscribe({
      next: (updatedProject) => {
        this.project.set(updatedProject);
        this.showEditProjectModal.set(false);
        alert('Proyecto actualizado correctamente');
      },
      error: (err) => console.error('Error updating project', err),
    });
  }

  protected exportProjectReport() {
    this.isExportingReport.set(true);
    this.dataService.getProjectReport(this.projectId()).subscribe({
      next: (report) => {
        this.isExportingReport.set(false);

        // Generate professional HTML report
        const htmlReport = this.generateHTMLReport(report);

        // Set content and show modal
        this.reportHtmlContent.set(this.sanitizer.bypassSecurityTrustHtml(htmlReport));
        this.showReportPreview.set(true);

        this.notifications.success('Reporte generado correctamente');
      },
      error: (err) => {
        this.isExportingReport.set(false);
        console.error('Error exporting report', err);
        this.notifications.error('Error al exportar el reporte');
      },
    });
  }

  protected closeReportPreview() {
    this.showReportPreview.set(false);
    this.reportHtmlContent.set('');
  }

  protected printReportPreview() {
    const iframe = document.getElementById('report-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  }

  private generateHTMLReport(report: any): string {
    const projectName = report.project.name || 'Proyecto';
    const projectDesc = report.project.description || 'Sin descripción';
    const projectStatus = report.project.status === 'production' ? 'Producción' : 'En Desarrollo';
    const overallProgress = report.summary.overallProgress || 0;
    const generatedDate = new Date(report.generatedAt).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Fix logo path - User requested system favicon
    const logoUrl = 'favicon.ico';

    // Filter departments with tasks
    const activeDepartments = report.progressByDepartment.filter((dept: any) => dept.total > 0);

    // Generate department progress HTML
    const departmentsHTML = activeDepartments.map((dept: any) => `
      <div class="dept-card">
        <div class="dept-header">
          <div class="dept-name" style="background-color: ${dept.department.color}">
            ${dept.department.name}
          </div>
          <div class="dept-progress-text">${dept.progress}%</div>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${dept.progress}%; background-color: ${dept.department.color}"></div>
        </div>
        <div class="dept-stats">
          <span>Total: ${dept.total}</span>
          <span>Completadas: ${dept.completed}</span>
          <span>En Progreso: ${dept.inProgress}</span>
          <span>Pendientes: ${dept.pending}</span>
        </div>
      </div>
    `).join('');

    // Generate tasks HTML
    const tasksHTML = report.tasks.map((task: any) => {
      const statusColors: any = {
        'pending': '#f59e0b',
        'in-progress': '#2563eb', // Standard Blue
        'completed': '#10b981',
        'cancelled': '#ef4444'
      };
      const statusLabels: any = {
        'pending': 'Pendiente',
        'in-progress': 'En Progreso',
        'completed': 'Completada',
        'cancelled': 'Cancelada'
      };

      const createdDate = new Date(task.createdAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return `
        <tr>
          <td>${task.title}</td>
          <td>${task.departmentName || 'N/A'}</td>
          <td>${createdDate}</td>
          <td>${task.assignedToName || 'Sin asignar'}</td>
          <td>
            <span class="status-badge" style="background-color: ${statusColors[task.status]} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              ${statusLabels[task.status]}
            </span>
          </td>
          <td>${task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Media' : 'Baja'}</td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <style>
    /* Force background colors printing */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  </style>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte - ${projectName}</title>
  <style>
    /* Ultra-Compact Print Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.2;
      color: #333;
      background: white;
      font-size: 11px; /* Base font small */
    }
    
    .container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      background: white;
    }
    
    /* Header Compact */
    .header {
      border-bottom: 2px solid #2563eb;
      padding: 5px 15px; /* Minimal padding */
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .brand-area {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-logo {
      height: 16px;
      width: 16px;
      object-fit: contain;
    }

    .brand-name {
      font-size: 16px;
      font-weight: 800;
      color: #1e293b;
    }

    .report-info {
      text-align: right;
    }

    .report-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
    }

    .project-title-header {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    
    .content {
      padding: 0 15px;
    }

    .section {
      margin-bottom: 10px;
    }

    .section-title {
      font-size: 12px;
      color: #0f172a;
      margin-bottom: 5px;
      padding-bottom: 2px;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 700;
      text-transform: uppercase;
    }

    /* Summary Grid - Ultra Compact */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    .summary-card {
      background: white;
      border: 1px solid #e2e8f0;
      padding: 4px;
      border-radius: 4px;
      text-align: center;
    }

    .summary-card .number {
      font-size: 16px;
      font-weight: 800;
      line-height: 1;
      color: #2563eb;
    }

    .summary-card .label {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
    }

    /* Overall Progress */
    .overall-progress {
      background: #f8fafc;
      padding: 5px 10px;
      border-radius: 4px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid #e2e8f0;
    }

    .overall-progress h3 {
      margin: 0;
      color: #334155;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .progress-bar-container {
      background: #cbd5e1;
      height: 12px; /* Thin bar */
      border-radius: 6px;
      overflow: hidden;
      flex-grow: 1;
    }
    
    .progress-bar-fill {
      height: 100%;
      background-color: #2563eb !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 9px;
      font-weight: 700;
      line-height: 12px;
    }
    
    /* Department Grid */
    .dept-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
    }
    
    .dept-card {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px;
      background: white;
    }

    .dept-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .dept-name {
      color: white;
      padding: 1px 8px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 10px;
    }

    .dept-progress-text {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }

    .dept-stats {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 9px;
      color: #64748b;
    }
    
    /* Table Compact */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px; /* Small table text */
    }
    
    th {
      background: #f1f5f9;
      color: #475569;
      padding: 4px 6px;
      text-align: left;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
      font-size: 10px;
      text-transform: uppercase;
    }
    
    td {
      padding: 3px 6px; /* Super compact cells */
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      color: white;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      line-height: 1;
    }
    
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        max-width: 100%;
      }

      .no-print {
        display: none;
      }

      .header {
        padding: 20px 0;
      }

      .summary-card {
        border: 1px solid #cbd5e1;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-area">
        <img src="favicon.ico" alt="SisProyect" class="brand-logo" onerror="this.onerror=null; this.src='assets/images/logo.png'">
        <span class="brand-name">SISPROYECT</span>
      </div>
      <div class="report-info">
        <div class="report-label">REPORTE DE PROYECTO</div>
        <div class="project-title-header">${projectName}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
          ${projectStatus.toUpperCase()}
        </div>
      </div>
    </div>
    
    <div class="content">
      <!-- Summary Section -->
      <div class="section">
        <h2 class="section-title">RESUMEN DEL PROYECTO</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="number">${report.summary.totalTasks}</div>
            <div class="label">Total Tareas</div>
          </div>
          <div class="summary-card">
            <div class="number">${report.summary.completedTasks}</div>
            <div class="label">Completadas</div>
          </div>
          <div class="summary-card">
            <div class="number">${report.summary.activeTasks}</div>
            <div class="label">Activas</div>
          </div>
          <div class="summary-card">
            <div class="number">${report.summary.totalVersions}</div>
            <div class="label">Versiones</div>
          </div>
        </div>
        
        <div class="overall-progress">
          <h3>PROGRESO GENERAL</h3>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${overallProgress}%">
              ${overallProgress}%
            </div>
          </div>
        </div>
      </div>
      
      ${activeDepartments.length > 0 ? `
      <!-- Department Progress -->
      <div class="section">
        <h2 class="section-title">PROGRESO POR DEPARTAMENTO</h2>
        <div class="dept-grid">
          ${departmentsHTML}
        </div>
      </div>
      ` : ''}
      
      <!-- Tasks Table -->
      <div class="section">
        <h2 class="section-title">DETALLE DE TAREAS (${report.tasks.length})</h2>
        ${report.tasks.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Departamento</th>
              <th>Fecha Creación</th>
              <th>Asignado a</th>
              <th>Estado</th>
              <th>Prioridad</th>
            </tr>
          </thead>
          <tbody>
            ${tasksHTML}
          </tbody>
        </table>
        ` : '<p style="color: #64748b; font-style: italic;">No hay tareas registradas en este proyecto.</p>'}
      </div>
      
      ${report.versions.length > 0 ? `
      <!-- Versions -->
      <div class="section">
        <h2 class="section-title">HISTORIAL DE VERSIONES</h2>
        <table style="width: 100%;">
          <thead>
             <tr>
               <th>Versión</th>
               <th>Creada por</th>
               <th>Fecha</th>
             </tr>
          </thead>
          <tbody>
          ${report.versions.map((v: any) => `
            <tr>
              <td><strong>${v.versionName}</strong></td>
              <td>${v.createdByName || 'Sistema'}</td>
              <td>${new Date(v.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
          `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p><strong>SisProyect</strong> - Sistema de Gestión de Proyectos</p>
      <p>Reporte generado el ${generatedDate}</p>
    </div>
  </div>
  <script>
    // No auto-print inside modal, user triggers it manually
  </script>
</body>
</html>
    `;
  }
}

interface TaskNode {
  task: Task;
  children: TaskNode[];
}
