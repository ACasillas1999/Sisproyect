import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { DataService, Project, Workspace } from '../../data.service';
import { AuthService } from '../../auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SidebarComponent, SpinnerComponent, PaginationComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent {
  private readonly dataService = inject(DataService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly projects = signal<Project[]>([]);
  protected readonly filteredProjects = signal<Project[]>([]);
  protected readonly projectStats = signal<Record<string, { total: number; completed: number }>>({});
  protected readonly showCreateModal = signal(false);
  protected readonly workspaces = signal<Workspace[]>([]);
  protected readonly selectedWorkspaceId = signal<string | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isCreating = signal(false);

  // Paginación
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 9; // 3x3 grid

  protected readonly paginatedProjects = computed(() => {
    const filtered = this.filteredProjects();
    const page = this.currentPage();
    const start = (page - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return filtered.slice(start, end);
  });

  protected readonly newProject = signal({
    name: '',
    description: '',
    status: 'development',
    start: '',
    end: '',
    workspaceId: '',
  });

  constructor() {
    this.loadWorkspaces();
    this.loadProjects();

    // Listen to query params for workspace filtering
    this.route.queryParams.subscribe(params => {
      this.selectedWorkspaceId.set(params['workspace'] || null);
      this.filterProjects();
    });
  }

  private loadWorkspaces() {
    this.dataService.getWorkspaces().subscribe({
      next: (workspaces) => this.workspaces.set(workspaces),
      error: (err) => console.error('Error loading workspaces', err)
    });
  }

  private filterProjects() {
    const workspaceId = this.selectedWorkspaceId();
    const allProjects = this.projects();

    if (!workspaceId) {
      this.filteredProjects.set(allProjects);
    } else {
      this.filteredProjects.set(allProjects.filter(p => p.workspaceId === workspaceId));
    }

    // Reset a la primera página cuando se filtra
    this.currentPage.set(1);
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    // Scroll al inicio de la lista
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private loadProjects() {
    const currentUser = this.auth.user;
    // Si el usuario no es admin, filtrar por su departamento
    const departmentId = (currentUser?.role !== 'admin') ? currentUser?.departmentId : undefined;

    this.isLoading.set(true);
    this.dataService.getProjects(departmentId).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.filterProjects();
        projects.forEach((project) => this.loadProjectStats(project.id));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading projects', err);
        this.isLoading.set(false);
      },
    });
  }

  private loadProjectStats(projectId: string) {
    this.dataService.getProjectStats(projectId).subscribe({
      next: (stats) => {
        this.projectStats.update((current) => ({
          ...current,
          [projectId]: stats ?? { total: 0, completed: 0 },
        }));
      },
      error: (err) => console.error(`Error loading stats for project ${projectId}`, err),
    });
  }

  protected selectedLogo: File | null = null;

  protected openCreateModal() {
    this.newProject.set({
      name: '',
      description: '',
      status: 'development',
      start: '',
      end: '',
      workspaceId: '',
    });
    this.selectedLogo = null;
    this.showCreateModal.set(true);
  }

  protected onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedLogo = input.files[0];
    }
  }

  protected createProject() {
    const project = this.newProject();
    if (!project.name) return;

    const formData = new FormData();
    formData.append('name', project.name);
    formData.append('description', project.description);
    formData.append('status', project.status);
    if (project.start) formData.append('start', project.start);
    if (project.end) formData.append('end', project.end);
    if (project.workspaceId) formData.append('workspaceId', project.workspaceId);

    const userId = this.auth.user?.id;
    if (userId) {
      formData.append('createdBy', userId);
    }

    if (this.selectedLogo) {
      formData.append('logo', this.selectedLogo);
    }

    this.isCreating.set(true);
    this.dataService
      .createProject(formData)
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.showCreateModal.set(false);
          this.loadProjects();
        },
        error: (err) => {
          console.error('Error creating project', err);
          this.isCreating.set(false);
        },
      });
  }

  protected getProjectStats(projectId: string): { total: number; completed: number } {
    return this.projectStats()[projectId] || { total: 0, completed: 0 };
  }
  protected getProgress(projectId: string): number {
    const stats = this.getProjectStats(projectId);
    return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  }

  protected getLogoUrl(logoPath: string): string {
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${logoPath}`;
  }

  protected getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      development: 'En Desarrollo',
      production: 'Producción',
    };
    return labels[status] || status;
  }
}
