import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-nexus-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="pointer-events-auto min-w-[300px] p-4 rounded-xl border backdrop-blur-md shadow-xl animate-slide-up flex items-center gap-3"
             [ngClass]="{
               'bg-green-500/10 border-green-500/20 text-green-200': toast.type === 'success',
               'bg-red-500/10 border-red-500/20 text-red-200': toast.type === 'error',
               'bg-violet-500/10 border-violet-500/20 text-violet-200': toast.type === 'info'
             }">
          
          <!-- Icon based on type -->
          @if (toast.type === 'success') { <span>✅</span> }
          @if (toast.type === 'error') { <span>❌</span> }
          @if (toast.type === 'info') { <span>ℹ️</span> }

          <span class="text-sm font-medium">{{ toast.message }}</span>
          
          <button (click)="toastService.remove(toast.id)" class="ml-auto hover:text-white transition-colors">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slide-up 0.3s cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class NexusToastComponent {
  toastService = inject(ToastService);
}
