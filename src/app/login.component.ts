import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { SpinnerComponent } from './components/spinner/spinner.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly dataService = inject(DataService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected form = { username: '', password: '' };
  protected message = signal('');
  protected isLoading = signal(false);

  protected login() {
    if (!this.form.username || !this.form.password) {
      this.message.set('Usuario y password requeridos');
      return;
    }
    this.isLoading.set(true);
    this.message.set('');
    this.dataService.login(this.form).subscribe({
      next: (resp) => {
        this.isLoading.set(false);
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
      error: () => {
        this.isLoading.set(false);
        this.message.set('Credenciales invalidas');
      },
    });
  }
}
