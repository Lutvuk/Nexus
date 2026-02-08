import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../services/dialog.service';

@Component({
    selector: 'app-nexus-global-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    @if (dialogService.activeDialog(); as dialog) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center backdrop p-4 animate-fade-in"
          style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px);" (click)="onBackdropClick($event)">
          
          <div class="w-full max-w-md bg-[#0F172A]/95 border border-white/10 rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
               style="box-shadow: 0 0 40px rgba(139, 92, 246, 0.2);">
              
              <!-- Header -->
              <div class="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <h2 class="text-xl font-bold text-white tracking-tight">{{ dialog.title }}</h2>
                  <button (click)="close(null)" class="text-white/40 hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
              </div>

              <!-- Body -->
              <div class="p-6">
                  @if (dialog.type === 'confirm') {
                      <p class="text-white/80 whitespace-pre-line">{{ dialog.message }}</p>
                  } @else {
                      <div class="flex flex-col gap-2">
                          <label class="text-sm font-medium text-white/60">{{ dialog.promptLabel || 'Input' }}</label>
                          <input type="text" [(ngModel)]="inputValue" (keydown.enter)="confirm()" autoFocus
                              class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
                              [placeholder]="dialog.promptValue || ''">
                      </div>
                  }
              </div>

              <!-- Footer -->
              <div class="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/5">
                  <button (click)="close(null)" 
                      class="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all font-medium">
                      Cancel
                  </button>
                  <button (click)="confirm()" 
                      class="px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-violet-500/20"
                      [ngClass]="dialog.isDanger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'">
                      {{ dialog.confirmLabel || 'Confirm' }}
                  </button>
              </div>
          </div>
      </div>
    }
  `,
    styles: [`
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }
    @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .animate-scale-in { animation: scale-in 0.2s ease-out; }
  `]
})
export class NexusGlobalDialogComponent {
    dialogService = inject(DialogService);
    inputValue = '';

    onBackdropClick(event: MouseEvent) {
        if ((event.target as HTMLElement).classList.contains('backdrop')) {
            this.close(null);
        }
    }

    confirm() {
        if (this.dialogService.activeDialog()?.type === 'prompt') {
            this.close(this.inputValue);
        } else {
            this.close(true);
        }
    }

    close(result: any) {
        this.dialogService.close(result);
        this.inputValue = ''; // Reset
    }
}
