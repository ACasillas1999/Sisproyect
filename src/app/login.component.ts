import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DataService } from './data.service';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly dataService = inject(DataService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected form = { username: '', password: '' };
  protected message = signal('');

  protected login() {
    if (!this.form.username || !this.form.password) {
      this.message.set('Usuario y password requeridos');
      return;
    }
    this.dataService.login(this.form).subscribe({
      next: (resp) => {
        if (resp.ok && resp.user) {
          this.auth.login({
            id: resp.user.id,
            username: resp.user.username,
            role: resp.user.role,
          });
          this.router.navigateByUrl('/');
        } else {
          this.message.set('Credenciales invalidas');
        }
      },
      error: () => this.message.set('Credenciales invalidas'),
    });
  }
}
