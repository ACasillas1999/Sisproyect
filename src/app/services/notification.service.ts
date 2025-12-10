import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notifications = signal<Notification[]>([]);

  getNotifications() {
    return this.notifications.asReadonly();
  }

  success(message: string, duration = 3000) {
    this.show('success', message, duration);
  }

  error(message: string, duration = 5000) {
    this.show('error', message, duration);
  }

  warning(message: string, duration = 4000) {
    this.show('warning', message, duration);
  }

  info(message: string, duration = 3000) {
    this.show('info', message, duration);
  }

  private show(type: NotificationType, message: string, duration: number) {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, type, message, duration };

    this.notifications.update(notifications => [...notifications, notification]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  remove(id: string) {
    this.notifications.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }
}
