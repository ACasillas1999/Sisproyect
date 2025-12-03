import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService, Department, Project, Task, User } from './data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
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
  protected users = signal<User[]>([]);
  protected newUser = { email: '', password: '', role: 'usuario' };
  protected loginForm = { email: '', password: '' };
  protected loginMessage = signal('');

  constructor() {
    effect(() => {
      const depts = this.departments() ?? [];
      if (!this.selectedDepartmentId() && depts.length) {
        this.selectedDepartmentId.set(depts[0].id);
      }
    });
    this.loadUsers();
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

  protected createUser() {
    if (!this.newUser.email || !this.newUser.password || !this.newUser.role) {
      this.loginMessage.set('Completa email, password y rol para crear usuario');
      return;
    }
    this.dataService.createUser(this.newUser).subscribe({
      next: () => {
        this.newUser = { email: '', password: '', role: 'usuario' };
        this.loginMessage.set('Usuario creado');
        this.loadUsers();
      },
      error: () => this.loginMessage.set('Error creando usuario'),
    });
  }

  protected deleteUser(id: string) {
    this.dataService.deleteUser(id).subscribe({
      next: () => this.loadUsers(),
      error: () => this.loginMessage.set('Error eliminando usuario'),
    });
  }

  protected login() {
    if (!this.loginForm.email || !this.loginForm.password) {
      this.loginMessage.set('Email y password requeridos');
      return;
    }
    this.dataService.login(this.loginForm).subscribe({
      next: (resp) => {
        if (resp.ok && resp.user) {
          this.loginMessage.set(`Login ok. Rol: ${resp.user.role}`);
        } else {
          this.loginMessage.set('Credenciales invalidas');
        }
      },
      error: () => this.loginMessage.set('Credenciales invalidas'),
    });
  }

  private loadUsers() {
    this.dataService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.loginMessage.set('Error cargando usuarios'),
    });
  }
}
