import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

@Component({
    selector: 'app-archive-explorer',
    standalone: true,
    imports: [CommonModule, DragDropModule],
    template: `
    <aside class="fixed top-12 bottom-0 right-0 z-50 w-full xs:w-80 sm:w-96 nexus-panel-shell border-l border-white/10 flex flex-col" (click)="$event.stopPropagation()">
      <header class="nexus-panel-header flex items-center justify-between">
        <div>
          <h3 class="nexus-panel-title">Archived Cards</h3>
          <p class="text-[11px] text-white/45 mt-0.5">Drag back to any list to restore.</p>
        </div>
        <button (click)="closed.emit()" class="nexus-icon-btn" aria-label="Close archived panel">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
      </header>

      <div cdkDropList id="archived-drop-list" [cdkDropListData]="archivedCards" [cdkDropListConnectedTo]="connectedTo"
          (cdkDropListDropped)="onDrop($event)"
          class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        @for (card of archivedCards; track card.id) {
          <div cdkDrag [cdkDragData]="card" class="rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] p-3 transition-colors group cursor-grab active:cursor-grabbing shadow-sm">
            <h4 class="text-sm font-semibold text-white truncate">{{ card.title }}</h4>
            <p class="text-[11px] text-white/45 mt-1">Archived {{ card.archived_at | date:'MMM d, y, h:mm a' }}</p>
            <div class="mt-3 flex gap-2">
              <button (click)="restoreCard.emit(card)" class="flex-1 h-8 rounded-md bg-violet-600/25 hover:bg-violet-600/40 text-violet-200 text-xs font-semibold transition-colors">
                Restore
              </button>
              <button (click)="deletePermanently.emit(card)" class="h-8 px-2.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs transition-colors">
                Delete
              </button>
            </div>
          </div>
        } @empty {
          <div class="text-center py-12 text-white/45 text-sm">No archived cards.</div>
        }
      </div>
    </aside>
  `,
    styles: [`
    :host { display: block; }
  `]
})
export class ArchiveExplorerComponent {
    @Input({ required: true }) archivedCards: any[] = [];
    @Input() connectedTo: string[] = [];
    @Output() closed = new EventEmitter<void>();
    @Output() restoreCard = new EventEmitter<any>();
    @Output() cardDropped = new EventEmitter<CdkDragDrop<any[]>>();
    @Output() deletePermanently = new EventEmitter<any>();

    onDrop(event: CdkDragDrop<any[]>) {
        this.cardDropped.emit(event);
    }
}
