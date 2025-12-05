import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DataService, Department, Project, Task } from '../../data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterModule, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly dataService = inject(DataService);

  protected readonly title = signal('Sisproyect');

  protected readonly departments = toSignal(this.dataService.getDepartments(), {
    initialValue: [] as Department[],
  });
  protected readonly projects = toSignal(this.dataService.getProjects(), {
    initialValue: [] as Project[],
  });
  protected readonly tasks = toSignal(this.dataService.getTasks(), {
    initialValue: [] as Task[],
  });

  protected readonly selectedDepartmentId = signal('');

  constructor() {
    effect(() => {
      const depts = this.departments() ?? [];
      if (!this.selectedDepartmentId() && depts.length) {
        this.selectedDepartmentId.set(depts[0].id);
      }
    });
  }

  protected readonly currentDepartment = computed(() => {
    const depts = this.departments() ?? [];
    return depts.find((d) => d.id === this.selectedDepartmentId()) ?? null;
  });

  protected readonly departmentSummaries = computed(() => {
    const today = new Date();
    return (this.departments() ?? []).map((department) => {
      const deptTasks = (this.tasks() ?? []).filter((t) => t.departmentId === department.id);
      const total = deptTasks.length;
      const done = deptTasks.filter((t) => t.status === 'done').length;
      const open = deptTasks.filter((t) => t.status !== 'done').length;
      const overdue = deptTasks.filter(
        (t) => t.status !== 'done' && new Date(t.due) < today,
      ).length;
      const progress = total ? Math.round((done / total) * 100) : 0;

      return { ...department, total, done, open, overdue, progress };
    });
  });

  protected readonly departmentMetrics = computed(() => {
    const currentId = this.selectedDepartmentId();
    const today = new Date();
    const deptTasks = (this.tasks() ?? []).filter((t) => t.departmentId === currentId);
    const total = deptTasks.length;
    const done = deptTasks.filter((t) => t.status === 'done').length;
    const pending = deptTasks.filter((t) => t.status === 'pending').length;
    const inProgress = deptTasks.filter((t) => t.status === 'in-progress').length;
    const overdue = deptTasks.filter(
      (t) => t.status !== 'done' && new Date(t.due) < today,
    ).length;
    const nearDue = deptTasks.filter((t) => {
      if (t.status === 'done') return false;
      const diffDays = (new Date(t.due).getTime() - today.getTime()) / 86400000;
      return diffDays >= 0 && diffDays <= 7;
    }).length;
    const progress = total ? Math.round((done / total) * 100) : 0;

    return { total, done, pending, inProgress, overdue, nearDue, progress };
  });

  protected readonly projectSummaries = computed(() => {
    const deptId = this.selectedDepartmentId();
    const today = new Date();

    return (this.projects() ?? []).map((project) => {
      const projTasks = (this.tasks() ?? []).filter(
        (t) => t.projectId === project.id && t.departmentId === deptId,
      );
      const total = projTasks.length;
      const done = projTasks.filter((t) => t.status === 'done').length;
      const open = projTasks.filter((t) => t.status !== 'done').length;
      const overdue = projTasks.filter(
        (t) => t.status !== 'done' && new Date(t.due) < today,
      ).length;
      const progress = total ? Math.round((done / total) * 100) : 0;

      return { ...project, total, done, open, overdue, progress };
    });
  });

  protected readonly boardColumns = computed(() => {
    const deptId = this.selectedDepartmentId();
    const deptTasks = (this.tasks() ?? []).filter((t) => t.departmentId === deptId);
    return {
      pending: deptTasks.filter((t) => t.status === 'pending'),
      inProgress: deptTasks.filter((t) => t.status === 'in-progress'),
      done: deptTasks.filter((t) => t.status === 'done'),
    };
  });

  protected selectDepartment(departmentId: string) {
    this.selectedDepartmentId.set(departmentId);
  }

  protected projectName(projectId: string): string {
    return this.projects().find((p) => p.id === projectId)?.name ?? 'Proyecto';
  }
}
