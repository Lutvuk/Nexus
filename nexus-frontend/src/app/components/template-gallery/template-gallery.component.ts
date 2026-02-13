import { Component, EventEmitter, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardService } from '../../services/board.service';
import { BoardTemplate } from '../../models/board.model';

@Component({
    selector: 'app-template-gallery',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-xl" (click)="close.emit()"></div>
      
      <div class="relative z-10 w-full max-w-4xl max-h-[85vh] overflow-hidden bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col">
        <!-- Header -->
        <div class="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div>
            <h2 class="text-2xl font-bold text-white">Start with a Template</h2>
            <p class="text-white/50 text-sm">Choose a layout to jumpstart your project</p>
          </div>
          <button (click)="close.emit()" class="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
          @if (isLoading()) {
            <div class="flex flex-col items-center justify-center py-20 gap-4">
              <div class="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
              <p class="text-white/40 font-medium">Loading templates...</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <!-- "Create Blank" option -->
              <div (click)="selectTemplate(null)" 
                   class="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/50 hover:bg-white/10 transition-all cursor-pointer flex flex-col min-h-[260px] justify-center items-center gap-4 text-center">
                <div class="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white/40 group-hover:scale-110 group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white">Empty Board</h3>
                  <p class="text-xs text-white/40">Start from scratch</p>
                </div>
              </div>

              <!-- Real Templates -->
              @for (template of templates(); track template.id) {
                <div (click)="selectTemplate(template)" 
                     class="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/50 hover:bg-white/10 transition-all cursor-pointer min-h-[260px] flex flex-col justify-between">
                  
                  <!-- Abstract Board Preview -->
                  <div class="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity mb-4">
                    <div class="flex-1 h-16 bg-violet-500/20 rounded-lg border border-violet-500/30 flex flex-col p-1.5 gap-1.5">
                      <div class="h-4 w-full bg-violet-500/40 rounded shadow-sm"></div>
                      <div class="h-3 w-3/4 bg-violet-500/20 rounded"></div>
                    </div>
                    <div class="flex-1 h-16 bg-cyan-500/20 rounded-lg border border-cyan-500/30 flex flex-col p-1.5 gap-1.5 translate-y-2">
                       <div class="h-4 w-full bg-cyan-500/40 rounded shadow-sm"></div>
                       <div class="h-3 w-5/6 bg-cyan-500/20 rounded"></div>
                    </div>
                    <div class="flex-1 h-16 bg-indigo-500/20 rounded-lg border border-indigo-500/30 flex flex-col p-1.5 gap-1.5">
                       <div class="h-4 w-full bg-indigo-500/40 rounded shadow-sm"></div>
                    </div>
                  </div>

                  <div class="relative z-10">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1 block">{{ template.category }}</span>
                    <h3 class="text-base font-bold text-white group-hover:text-violet-200 transition-colors">{{ template.name }}</h3>
                    <p class="text-[11px] text-white/50 mt-1 leading-relaxed max-h-24 overflow-y-auto pr-1 custom-scrollbar">{{ template.description }}</p>
                  </div>

                  <!-- Hover Arrow -->
                  <div class="absolute bottom-4 right-4 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all text-violet-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
    styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  `]
})
export class TemplateGalleryComponent implements OnInit {
    boardService = inject(BoardService);

    @Output() close = new EventEmitter<void>();
    @Output() selected = new EventEmitter<BoardTemplate | null>();

    templates = signal<BoardTemplate[]>([]);
    isLoading = signal(true);

    ngOnInit() {
        this.boardService.getBoardTemplates().subscribe({
            next: (data) => {
                this.templates.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    selectTemplate(template: BoardTemplate | null) {
        this.selected.emit(template);
    }
}
