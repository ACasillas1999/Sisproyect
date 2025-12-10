import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DataService, User, Department } from '../../data.service';

interface UserForm {
  id?: string;
  username: string;
  password: string;
  role: string;
  departmentId?: string;
  active: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterModule, SidebarComponent],
  templateUrl: './users.component.html',
  styleUrls: ['../dashboard/dashboard.component.css', './users.component.css'],
})
export class UsersComponent {
  private readonly dataService = inject(DataService);

  protected users = signal<User[]>([]);
  protected departments = signal<Department[]>([]);
  protected form = signal<UserForm>({ username: '', password: '', role: 'usuario', departmentId: '', active: true });
  protected message = signal('');
  protected isEditing = signal(false);
  protected showModal = signal(false);

  constructor() {
    this.loadUsers();
    this.loadDepartments();
  }

  private loadDepartments() {
    this.dataService.getDepartments().subscribe({
      next: (departments) => this.departments.set(departments),
      error: () => this.message.set('Error cargando departamentos'),
    });
  }

  protected startCreate() {
    this.isEditing.set(false);
    this.form.set({ username: '', password: '', role: 'usuario', departmentId: '', active: true });
    this.message.set('');
    this.showModal.set(true);
  }

  protected startEdit(user: User) {
    this.isEditing.set(true);
    this.form.set({
      id: user.id,
      username: user.username,
      password: '',
      role: user.role,
      departmentId: user.departmentId || '',
      active: Boolean(user.active ?? 1),
    });
    this.message.set('');
    this.showModal.set(true);
  }

  protected saveUser() {
    const payload = this.form();
    if (!payload.username || (!payload.password && !this.isEditing())) {
      this.message.set('Usuario y password (para alta) son requeridos');
      return;
    }

    if (this.isEditing() && payload.id) {
      this.dataService
        .updateUser(payload.id, {
          username: payload.username,
          password: payload.password || undefined,
          role: payload.role,
          departmentId: payload.departmentId || undefined,
          active: payload.active ? 1 : 0,
        })
        .subscribe({
          next: () => {
            this.message.set('Usuario actualizado');
            this.showModal.set(false);
            this.loadUsers();
          },
          error: () => this.message.set('Error actualizando usuario'),
        });
    } else {
      this.dataService
        .createUser({
          username: payload.username,
          password: payload.password,
          role: payload.role,
          departmentId: payload.departmentId || undefined,
          active: payload.active ? 1 : 0,
        })
        .subscribe({
          next: () => {
            this.message.set('Usuario creado');
            this.showModal.set(false);
            this.loadUsers();
          },
          error: () => this.message.set('Error creando usuario'),
        });
    }
  }

  protected deleteUser(id: string) {
    this.dataService.deleteUser(id).subscribe({
      next: () => {
        this.message.set('Usuario eliminado');
        this.loadUsers();
      },
      error: () => this.message.set('Error eliminando usuario'),
    });
  }

  protected closeModal() {
    this.showModal.set(false);
    this.message.set('');
  }

  private loadUsers() {
    this.dataService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.message.set('Error cargando usuarios'),
    });
  }

  protected getDepartmentName(departmentId?: string): string {
    if (!departmentId) return 'Sin departamento';
    const dept = this.departments().find(d => d.id === departmentId);
    return dept?.name || 'Sin departamento';
  }
}
