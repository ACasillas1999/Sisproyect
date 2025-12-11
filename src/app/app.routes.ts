import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LoginComponent } from './login.component';
import { UsersComponent } from './pages/users/users.component';
import { ProjectsComponent } from './pages/projects/projects.component';
import { ProjectDetailComponent } from './pages/project-detail/project-detail.component';
import { VersionHistoryComponent } from './pages/version-history/version-history.component';
import { TimelineComponent } from './pages/timeline/timeline.component';
import { WorkspacesComponent } from './pages/workspaces/workspaces.component';
import { DepartmentsComponent } from './pages/departments/departments.component';
import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'projects', component: ProjectsComponent, canActivate: [authGuard] },
  { path: 'projects/:id', component: ProjectDetailComponent, canActivate: [authGuard] },
  { path: 'projects/:id/versions', component: VersionHistoryComponent, canActivate: [authGuard] },
  { path: 'timeline', component: TimelineComponent, canActivate: [authGuard] },
  { path: 'users', component: UsersComponent, canActivate: [adminGuard] },
  { path: 'departments', component: DepartmentsComponent, canActivate: [adminGuard] },
  { path: 'workspaces', component: WorkspacesComponent, canActivate: [adminGuard] },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '/projects' },
];
