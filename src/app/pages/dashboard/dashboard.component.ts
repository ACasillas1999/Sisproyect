import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DataService, Department, Project, Task } from '../../data.service';
import { AuthService } from '../../auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly dataService = inject(DataService);
  private readonly auth = inject(AuthService);

  protected readonly title = signal('Sisproyect');

  protected readonly departments = toSignal(this.dataService.getDepartments(), {
    initialValue: [] as Department[],
  });

  private readonly projectsSignal = signal<Project[]>([]);
  protected readonly projects = computed(() => this.projectsSignal());

  private readonly tasksSignal = signal<Task[]>([]);
  protected readonly tasks = computed(() => this.tasksSignal());

  protected readonly selectedDepartmentId = signal('');

  // Verificar si el usuario es admin
  protected readonly isAdmin = computed(() => this.auth.user?.role === 'admin');

  // Obtener el departamento del usuario actual
  protected readonly userDepartmentId = computed(() => this.auth.user?.departmentId || '');

  constructor() {
    // Load initial data
    this.dataService.getProjects().subscribe(projects => {
      this.projectsSignal.set(projects);
    });

    this.dataService.getTasks().subscribe(tasks => {
      this.tasksSignal.set(tasks);
    });

    effect(() => {
      const depts = this.departments() ?? [];
      const userDeptId = this.userDepartmentId();

      // Si no es admin, forzar el departamento del usuario
      if (!this.isAdmin() && userDeptId) {
        this.selectedDepartmentId.set(userDeptId);
      } else if (!this.selectedDepartmentId() && depts.length) {
        // Si es admin y no hay selección, seleccionar el primero
        this.selectedDepartmentId.set(depts[0].id);
      }
    });
  }

  protected getLogoUrl(logoPath: string): string {
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${logoPath}`;
  }

  protected readonly currentDepartment = computed(() => {
    const depts = this.departments() ?? [];
    return depts.find((d) => d.id === this.selectedDepartmentId()) ?? null;
  });

  protected readonly departmentMetrics = computed(() => {
    const currentId = this.selectedDepartmentId();
    const today = new Date();
    const deptTasks = (this.tasks() ?? []).filter((t) => t.departmentId === currentId);
    const total = deptTasks.length;
    const done = deptTasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
    const pending = deptTasks.filter((t) => t.status === 'pending').length;
    const inProgress = deptTasks.filter((t) => t.status === 'in-progress').length;
    const overdue = deptTasks.filter(
      (t) => (t.status !== 'done' && t.status !== 'completed') && t.due && new Date(t.due) < today,
    ).length;
    const nearDue = deptTasks.filter((t) => {
      if (t.status === 'done' || t.status === 'completed' || !t.due) return false;
      const diffDays = (new Date(t.due).getTime() - today.getTime()) / 86400000;
      return diffDays >= 0 && diffDays <= 7;
    }).length;
    const progress = total ? Math.round((done / total) * 100) : 0;

    return { total, done, pending, inProgress, overdue, nearDue, progress };
  });

  // Analytics metrics
  protected readonly completedTasksLastWeek = computed(() => {
    const deptId = this.selectedDepartmentId();
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return (this.tasks() ?? []).filter((t) =>
      t.departmentId === deptId &&
      t.status === 'completed' &&
      t.completedAt &&
      new Date(t.completedAt) >= oneWeekAgo
    ).length;
  });

  protected readonly completedTasksLastMonth = computed(() => {
    const deptId = this.selectedDepartmentId();
    const today = new Date();
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return (this.tasks() ?? []).filter((t) =>
      t.departmentId === deptId &&
      t.status === 'completed' &&
      t.completedAt &&
      new Date(t.completedAt) >= oneMonthAgo
    ).length;
  });

  protected readonly velocity = computed(() => {
    const deptId = this.selectedDepartmentId();
    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    const completedLast2Weeks = (this.tasks() ?? []).filter((t) =>
      t.departmentId === deptId &&
      t.status === 'completed' &&
      t.completedAt &&
      new Date(t.completedAt) >= twoWeeksAgo
    );

    // Velocity = promedio de tareas completadas por semana
    const velocityPerWeek = completedLast2Weeks.length / 2;
    return Math.round(velocityPerWeek * 10) / 10; // Redondear a 1 decimal
  });

  protected readonly burndownData = computed(() => {
    const deptId = this.selectedDepartmentId();
    const deptTasks = (this.tasks() ?? []).filter((t) => t.departmentId === deptId);

    // Agrupar tareas completadas por fecha
    const completedByDate: { [key: string]: number } = {};
    deptTasks.forEach((t) => {
      if (t.status === 'completed' && t.completedAt) {
        const date = new Date(t.completedAt).toISOString().split('T')[0];
        completedByDate[date] = (completedByDate[date] || 0) + 1;
      }
    });

    // Generar datos para últimos 7 días
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push({
        date: dateStr,
        day: date.toLocaleDateString('es-ES', { weekday: 'short' }),
        completed: completedByDate[dateStr] || 0
      });
    }

    return last7Days;
  });

  protected readonly averageCompletionTime = computed(() => {
    const deptId = this.selectedDepartmentId();
    const completedTasks = (this.tasks() ?? []).filter((t) =>
      t.departmentId === deptId &&
      t.status === 'completed' &&
      t.createdAt &&
      t.completedAt
    );

    if (completedTasks.length === 0) return 0;

    const totalDays = completedTasks.reduce((sum, task) => {
      const created = new Date(task.createdAt!).getTime();
      const completed = new Date(task.completedAt!).getTime();
      const days = (completed - created) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return Math.round(totalDays / completedTasks.length * 10) / 10; // Redondear a 1 decimal
  });

  protected selectDepartment(departmentId: string) {
    this.selectedDepartmentId.set(departmentId);
  }

  protected getBarHeight(completed: number): number {
    const data = this.burndownData();
    const maxCompleted = Math.max(...data.map(d => d.completed), 1); // Mínimo 1 para evitar división por 0

    // Calcular porcentaje relativo al máximo
    // Si hay al menos una tarea, escalar proporcionalmente
    if (completed === 0) return 0;

    // Altura mínima de 5% para barras con al menos 1 tarea
    const minHeight = 5;
    const scaledHeight = (completed / maxCompleted) * 95; // 95% máximo para dejar espacio

    return Math.max(minHeight, scaledHeight);
  }
}
