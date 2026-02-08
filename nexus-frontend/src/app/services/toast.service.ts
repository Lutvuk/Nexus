import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = crypto.randomUUID();
    const toast: Toast = { id, message, type };

    this.toasts.update(current => [...current, toast]);

    // Auto dismiss
    setTimeout(() => {
      this.remove(id);
    }, 3000);
  }

  remove(id: string) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
