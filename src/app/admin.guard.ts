import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/login');
  }

  const user = auth.user;
  if (user?.role === 'admin') {
    return true;
  }

  // Si no es admin, redirigir a proyectos
  return router.parseUrl('/projects');
};
