import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DataService, Project, ProjectVersion } from '../../data.service';

@Component({
  selector: 'app-version-history',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  templateUrl: './version-history.component.html',
  styleUrl: './version-history.component.css',
})
export class VersionHistoryComponent {
  private readonly dataService = inject(DataService);
  private readonly route = inject(ActivatedRoute);

  protected readonly projectId = signal<string>('');
  protected readonly project = signal<Project | null>(null);
  protected readonly versions = signal<ProjectVersion[]>([]);
  protected readonly selectedVersion = signal<ProjectVersion | null>(null);

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.projectId.set(id);
        this.loadProject();
        this.loadVersions();
      }
    });
  }

  private loadProject() {
    this.dataService.getProject(this.projectId()).subscribe({
      next: (project) => this.project.set(project),
      error: (err) => console.error('Error loading project', err),
    });
  }

  private loadVersions() {
    this.dataService.getProjectVersions(this.projectId()).subscribe({
      next: (versions) => this.versions.set(versions),
      error: (err) => console.error('Error loading versions', err),
    });
  }

  protected selectVersion(version: ProjectVersion) {
    this.selectedVersion.set(version);
  }

  protected closeVersionView() {
    this.selectedVersion.set(null);
  }

  protected formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  protected readonly versionStats = computed(() => {
    const version = this.selectedVersion();
    if (!version) return null;

    const tasks = version.snapshotData.tasks;
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const cancelled = tasks.filter((t) => t.status === 'cancelled').length;

    return { total, completed, inProgress, pending, cancelled };
  });
}
