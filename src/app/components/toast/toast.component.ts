import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  private readonly notificationService = inject(NotificationService);

  protected readonly notifications = this.notificationService.getNotifications();

  protected close(id: string) {
    this.notificationService.remove(id);
  }
}
