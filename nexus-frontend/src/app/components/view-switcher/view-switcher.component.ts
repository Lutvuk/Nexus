import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BoardViewType = 'BOARD' | 'TABLE' | 'CALENDAR' | 'PLANNER' | 'ANALYTICS';

@Component({
  selector: 'app-view-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-1 bg-slate-700/80 p-1 rounded-xl h-10">
      <button 
        (click)="selectView('BOARD')"
        [ngClass]="{'bg-slate-500/50 text-white': currentView === 'BOARD'}"
        class="h-full px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-slate-600/50 transition-colors flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3"/><rect width="7" height="5" x="14" y="3"/><rect width="7" height="9" x="14" y="12"/><rect width="7" height="5" x="3" y="16"/></svg>
        Board
      </button>
      
      <button 
        (click)="selectView('TABLE')"
        [ngClass]="{'bg-slate-500/50 text-white': currentView === 'TABLE'}"
        class="h-full px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-slate-600/50 transition-colors flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
        Table
      </button>

      <button 
        (click)="selectView('CALENDAR')"
        [ngClass]="{'bg-slate-500/50 text-white': currentView === 'CALENDAR'}"
        class="h-full px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-slate-600/50 transition-colors flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
        Calendar
      </button>

      <button
        (click)="selectView('PLANNER')"
        [ngClass]="{'bg-slate-500/50 text-white': currentView === 'PLANNER'}"
        class="h-full px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-slate-600/50 transition-colors flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
        Planner
      </button>

      <button 
        (click)="selectView('ANALYTICS')"
        [ngClass]="{'bg-slate-500/50 text-white': currentView === 'ANALYTICS'}"
        class="h-full px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-slate-600/50 transition-colors flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        Analytics
      </button>
    </div>
  `
})
export class ViewSwitcherComponent {
  @Input() currentView: BoardViewType = 'BOARD';
  @Output() viewChanged = new EventEmitter<BoardViewType>();

  selectView(view: BoardViewType) {
    this.viewChanged.emit(view);
  }
}
