import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService, Task, Project } from '../../data.service';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent {
  searchQuery = signal('');
  isSearching = signal(false);
  showResults = signal(false);

  // Cache de tareas y proyectos
  private tasks = signal<Task[]>([]);
  private projects = signal<Project[]>([]);

  constructor(
    private data: DataService,
    private router: Router
  ) {
    // Cargar tareas y proyectos
    this.loadData();

    // Listener para Ctrl+K o Cmd+K
    effect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          this.focusSearch();
        }
        // Cerrar con Escape
        if (e.key === 'Escape') {
          this.closeSearch();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => window.removeEventListener('keydown', handleKeyDown);
    });
  }

  private loadData() {
    this.data.getTasks().subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: (err) => console.error('Error loading tasks', err)
    });

    this.data.getProjects().subscribe({
      next: (projects) => this.projects.set(projects),
      error: (err) => console.error('Error loading projects', err)
    });
  }

  // Resultados filtrados
  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    const tasks = this.tasks();
    const projects = this.projects();

    // Buscar en tareas
    const matchingTasks = tasks.filter((task: Task) => {
      return (
        task.id.toLowerCase().includes(query) ||
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.status.toLowerCase().includes(query)
      );
    }).slice(0, 10); // Limitar a 10 resultados

    // Agregar información del proyecto a cada tarea
    return matchingTasks.map((task: Task) => {
      const project = projects.find((p: Project) => p.id === task.projectId);
      return {
        ...task,
        projectName: project?.name ?? 'Sin proyecto'
      };
    });
  });

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.showResults.set(value.trim().length > 0);
  }

  focusSearch() {
    const input = document.querySelector('.search-input') as HTMLInputElement;
    if (input) {
      input.focus();
      this.showResults.set(this.searchQuery().trim().length > 0);
    }
  }

  closeSearch() {
    this.showResults.set(false);
    this.searchQuery.set('');
  }

  navigateToTask(task: any) {
    this.closeSearch();
    this.router.navigate(['/projects', task.projectId], {
      queryParams: { taskId: task.id }
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'backlog': 'Backlog',
      'in-progress': 'En Progreso',
      'completed': 'Completada',
      'blocked': 'Bloqueada'
    };
    return labels[status] || status;
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'alta': 'Alta',
      'media': 'Media',
      'baja': 'Baja'
    };
    return labels[priority] || priority;
  }
}
