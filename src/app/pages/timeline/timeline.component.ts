import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DataService, VersionSummary, Project, Workspace } from '../../data.service';
import { RouterLink } from '@angular/router';

export interface ProjectTimeline {
  projectId: string;
  projectName: string;
  projectStatus?: string;
  workspaceId?: string;
  versions: VersionSummary[];
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterLink],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.css',
})
export class TimelineComponent {
  private readonly dataService = inject(DataService);

  protected readonly versions = signal<VersionSummary[]>([]);
  protected readonly workspaces = signal<Workspace[]>([]);

  protected readonly projectGroups = computed(() => {
    const allVersions = this.versions();
    const groups = new Map<string, ProjectTimeline>();

    for (const v of allVersions) {
      if (!groups.has(v.projectId)) {
        groups.set(v.projectId, {
          projectId: v.projectId,
          projectName: v.projectName || 'Proyecto Desconocido',
          projectStatus: v.projectStatus,
          workspaceId: v.workspaceId,
          versions: []
        });
      }
      groups.get(v.projectId)!.versions.push(v);
    }

    return Array.from(groups.values());
  });

  protected showDetailsModal = signal(false);
  protected selectedVersionDetails = signal<any>(null);

  protected readonly users = signal<Map<string, string>>(new Map());

  constructor() {
    effect(() => {
      this.loadVersions();
      this.loadUsers();
      this.loadWorkspaces();
    });
  }

  private loadWorkspaces() {
    this.dataService.getWorkspaces().subscribe({
      next: (workspaces) => this.workspaces.set(workspaces),
      error: (err) => console.error('Error loading workspaces', err)
    });
  }

  private loadUsers() {
    this.dataService.getUsers().subscribe({
      next: (users) => {
        const userMap = new Map<string, string>();
        users.forEach(u => userMap.set(u.id, u.username));
        this.users.set(userMap);
      },
      error: (err) => console.error('Error loading users', err)
    });
  }

  protected getUserName(userId: string): string {
    return this.users().get(userId) || 'Usuario';
  }

  private loadVersions() {
    this.dataService.getAllVersions().subscribe({
      next: (versions) => this.versions.set(versions),
      error: (err) => console.error('Error loading versions', err),
    });
  }

  protected openVersionDetails(versionId: string) {
    this.selectedVersionDetails.set(null);
    this.showDetailsModal.set(true);

    this.dataService.getVersionDetails(versionId).subscribe({
      next: (details) => this.selectedVersionDetails.set(details),
      error: (err) => {
        console.error('Error loading version details', err);
        alert('Error cargando detalles de la versión');
        this.showDetailsModal.set(false);
      }
    });
  }

  protected closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedVersionDetails.set(null);
  }
}
