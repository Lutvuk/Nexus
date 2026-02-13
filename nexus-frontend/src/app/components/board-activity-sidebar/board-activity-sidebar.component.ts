import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityFeedComponent } from '../activity-feed/activity-feed.component';

@Component({
    selector: 'app-board-activity-sidebar',
    standalone: true,
    imports: [CommonModule, ActivityFeedComponent],
    template: `
    <div class="fixed inset-x-0 top-12 bottom-0 z-40 bg-black/25" (click)="closed.emit()"></div>

    <aside class="fixed top-12 bottom-0 right-0 z-50 w-full xs:w-80 sm:w-96 nexus-panel-shell border-l border-white/10 flex flex-col">
      <header class="nexus-panel-header flex items-center justify-between">
        <div>
          <h3 class="nexus-panel-title">Board Activity</h3>
          <p class="text-[11px] text-white/45 mt-0.5">Latest updates in this board.</p>
        </div>
        <button (click)="closed.emit()" class="nexus-icon-btn" aria-label="Close board activity panel">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
      </header>
      <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
        @if (boardId) {
          <app-activity-feed [boardId]="boardId"></app-activity-feed>
        }
      </div>
    </aside>
  `,
    styles: [`
    :host { display: block; }
  `]
})
export class BoardActivitySidebarComponent {
    @Input({ required: true }) boardId!: string;
    @Output() closed = new EventEmitter<void>();
}
