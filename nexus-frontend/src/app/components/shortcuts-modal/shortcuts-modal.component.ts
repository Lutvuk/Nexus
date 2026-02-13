import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-shortcuts-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" (click)="close.emit()">
      <div class="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M6 12h.001"/><path d="M10 12h.001"/><path d="M14 12h.001"/><path d="M18 12h.001"/><path d="M7 16h10"/></svg>
            Keyboard Shortcuts
          </h3>
          <button (click)="close.emit()" class="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- content -->
        <div class="p-6">
          <div class="grid grid-cols-1 gap-4">
            @for (group of shortcuts; track group.name) {
              <div>
                <h4 class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">{{ group.name }}</h4>
                <div class="space-y-2">
                  @for (item of group.items; track item.key) {
                    <div class="flex items-center justify-between group">
                      <span class="text-sm text-white/80 group-hover:text-white transition-colors">{{ item.desc }}</span>
                      <div class="flex gap-1">
                        @for (k of item.keys; track k) {
                          <kbd class="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-xs font-mono text-white min-w-[24px] text-center shadow-sm">{{ k }}</kbd>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-white/5 px-6 py-3 text-center text-xs text-white/30">
          Press <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono">Esc</kbd> to close
        </div>

      </div>
    </div>
  `
})
export class ShortcutsModalComponent {
    @Output() close = new EventEmitter<void>();

    shortcuts = [
        {
            name: 'Navigation',
            items: [
                { desc: 'Show this help', keys: ['?'] },
                { desc: 'Search / Filter', keys: ['f'] },
                { desc: 'Close Modal / Clear', keys: ['Esc'] },
            ]
        },
        {
            name: 'Board Actions',
            items: [
                { desc: 'Add New Column', keys: ['c'] },
                { desc: 'Toggle Sidebar', keys: ['['] }, // New idea
            ]
        }
    ];
}
