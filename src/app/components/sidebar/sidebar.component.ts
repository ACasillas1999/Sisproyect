import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, SessionUser } from '../../auth.service';
import { DataService, Department, User, Workspace } from '../../data.service';
import { SearchBarComponent } from '../search-bar/search-bar.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SearchBarComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(DataService);
  private readonly router = inject(Router);

  protected readonly currentUser = signal<SessionUser | null>(null);
  protected readonly userDepartment = signal<Department | null>(null);
  protected readonly workspaces = signal<Workspace[]>([]);

  constructor() {
    effect(() => {
      this.currentUser.set(this.authService.user);
      this.loadUserDepartment();
    });
    this.loadWorkspaces();
  }

  private loadWorkspaces() {
    this.dataService.getWorkspaces().subscribe({
      next: (workspaces) => this.workspaces.set(workspaces),
      error: (err) => console.error('Error loading workspaces', err)
    });
  }

  private loadUserDepartment() {
    const user = this.currentUser();
    if (!user) {
      this.userDepartment.set(null);
      return;
    }

    // We need to fetch users to get the departmentId, and departments to get the details
    // In a real app we might have a specific endpoint for "me" or "profile"
    this.dataService.getUsers().subscribe(users => {
      const fullUser = users.find(u => u.id === user.id);
      if (fullUser?.departmentId) {
        this.dataService.getDepartments().subscribe(depts => {
          const dept = depts.find(d => d.id === fullUser.departmentId);
          this.userDepartment.set(dept || null);
        });
      }
    });
  }

  protected logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  protected isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }
}
