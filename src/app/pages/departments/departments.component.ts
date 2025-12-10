import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Department, User, Task } from '../../data.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './departments.component.html',
  styleUrl: './departments.component.css'
})
export class DepartmentsComponent {
  protected readonly departments = signal<Department[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly showCreateModal = signal(false);
  protected readonly showEditModal = signal(false);
  protected readonly newDepartment = signal({
    name: '',
    color: '#22d3ee'
  });
  protected readonly editDepartment = signal<Department | null>(null);

  protected readonly colorPresets = [
    '#22d3ee', // cyan
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
  ];

  constructor(private dataService: DataService) {
    this.loadDepartments();
    this.loadUsers();
    this.loadTasks();
  }

  private loadDepartments() {
    this.dataService.getDepartments().subscribe({
      next: (departments) => this.departments.set(departments),
      error: (err) => console.error('Error loading departments', err)
    });
  }

  private loadUsers() {
    this.dataService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (err) => console.error('Error loading users', err)
    });
  }

  private loadTasks() {
    this.dataService.getTasks().subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: (err) => console.error('Error loading tasks', err)
    });
  }

  protected openCreateModal() {
    this.newDepartment.set({
      name: '',
      color: '#22d3ee'
    });
    this.showCreateModal.set(true);
  }

  protected selectColorForNew(color: string) {
    this.newDepartment.update(d => ({ ...d, color }));
  }

  protected selectColorForEdit(color: string) {
    this.editDepartment.update(d => d ? { ...d, color } : null);
  }

  protected createDepartment() {
    const data = this.newDepartment();
    if (!data.name) {
      alert('El nombre es requerido');
      return;
    }

    this.dataService.createDepartment(data).subscribe({
      next: (department) => {
        this.departments.update(depts => [...depts, department]);
        this.showCreateModal.set(false);
      },
      error: (err) => {
        console.error('Error creating department', err);
        alert('Error creando departamento');
      }
    });
  }

  protected openEditModal(department: Department) {
    this.editDepartment.set({ ...department });
    this.showEditModal.set(true);
  }

  protected updateDepartment() {
    const dept = this.editDepartment();
    if (!dept || !dept.name) {
      alert('El nombre es requerido');
      return;
    }

    this.dataService.updateDepartment(dept.id, { name: dept.name, color: dept.color }).subscribe({
      next: (updated) => {
        this.departments.update(depts =>
          depts.map(d => d.id === updated.id ? updated : d)
        );
        this.showEditModal.set(false);
      },
      error: (err) => {
        console.error('Error updating department', err);
        alert('Error actualizando departamento');
      }
    });
  }

  protected deleteDepartment(id: string) {
    const userCount = this.users().filter(u => u.departmentId === id).length;
    const taskCount = this.tasks().filter(t => t.departmentId === id).length;

    if (userCount > 0 || taskCount > 0) {
      alert(`No se puede eliminar: hay ${userCount} usuario(s) y ${taskCount} tarea(s) asignadas a este departamento`);
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este departamento?')) return;

    this.dataService.deleteDepartment(id).subscribe({
      next: () => {
        this.departments.update(depts => depts.filter(d => d.id !== id));
      },
      error: (err) => {
        console.error('Error deleting department', err);
        alert(err.error?.message || 'Error eliminando departamento');
      }
    });
  }

  protected getUserCount(departmentId: string): number {
    return this.users().filter(u => u.departmentId === departmentId).length;
  }

  protected getTaskCount(departmentId: string): number {
    return this.tasks().filter(t => t.departmentId === departmentId).length;
  }
}
