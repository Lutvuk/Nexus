import { Component, EventEmitter, Input, Output, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { Card, Column } from '../../models/board.model';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-card-operation-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="close.emit()">
      <div class="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 class="text-lg font-semibold text-white">{{ action === 'move' ? 'Move' : 'Copy' }} Card</h3>
          <button (click)="close.emit()" class="text-white/50 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4">
          
          <div class="p-3 bg-white/5 rounded-lg border border-white/5">
            <h4 class="text-sm font-medium text-white/50 mb-1">Card</h4>
            <p class="text-white font-medium">{{ card.title }}</p>
          </div>

          <!-- Board Selection -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-white/70">Board</label>
            <select [(ngModel)]="selectedBoardId" (ngModelChange)="onBoardChange($event)"
              class="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500 transition-all">
              @for (b of boards(); track b.id) {
                <option [value]="b.id">{{ b.title }} {{ b.id === currentBoardId ? '(current)' : '' }}</option>
              }
            </select>
          </div>

          <!-- Column Selection -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-white/70">List</label>
            <select [(ngModel)]="selectedColumnId" (ngModelChange)="onColumnChange($event)"
              class="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500 transition-all"
              [disabled]="isLoadingColumns()">
              @for (col of columns(); track col.id) {
                <option [value]="col.id">{{ col.name }} {{ col.id === currentColumnId ? '(current)' : '' }}</option>
              }
            </select>
          </div>

          <!-- Position Selection (Optional/Simplified) -->
          <div class="space-y-2">
             <label class="text-sm font-medium text-white/70">Position</label>
             <select [(ngModel)]="selectedPosition" 
              class="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500 transition-all">
               <option [value]="1">Top</option>
               <option [value]="999999">Bottom</option> <!-- Simplified logic -->
             </select>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-white/5 flex justify-end gap-3 bg-white/5">
          <button (click)="close.emit()" class="px-4 py-2 rounded-lg text-white/70 hover:bg-white/5 transition-all font-medium">Cancel</button>
          <button (click)="submit()" 
            [disabled]="!isValid() || isSubmitting()"
            class="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isSubmitting() ? 'Processing...' : (action === 'move' ? 'Move' : 'Copy') }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class CardOperationModalComponent {
    @Input({ required: true }) card!: Card;
    @Input({ required: true }) action!: 'move' | 'copy';
    @Input({ required: true }) currentBoardId!: string;

    // Implicitly derived
    currentColumnId = '';

    @Output() close = new EventEmitter<void>();
    @Output() completed = new EventEmitter<void>();

    private boardService = inject(BoardService);
    private authService = inject(AuthService);

    boards = signal<any[]>([]);
    columns = signal<Column[]>([]);

    selectedBoardId = '';
    selectedColumnId = '';
    selectedPosition = 999999;

    isLoadingColumns = signal(false);
    isSubmitting = signal(false);

    constructor() {
        // Determine current column ID from input card
        effect(() => {
            // This runs once when component initializes/inputs change (if signals, but inputs are regular here)
            // Since we don't have OnInit, we do it in constructor or a method called by parent?
            // Actually, inputs are set before ngOnInit usually.
        });
    }

    ngOnInit() {
        this.currentColumnId = this.card.column_id;
        this.selectedBoardId = this.currentBoardId; // Default to current board
        this.selectedColumnId = this.currentColumnId;

        this.loadBoards();
        this.loadColumns(this.currentBoardId); // Initial load
    }

    loadBoards() {
        this.boardService.getBoards().subscribe(boards => {
            this.boards.set(boards);
        });
    }

    loadColumns(boardId: string) {
        this.isLoadingColumns.set(true);
        this.boardService.getBoardById(boardId).subscribe(data => {
            this.columns.set(data.columns);
            // If we switched boards, select first column
            if (boardId !== this.currentBoardId && data.columns.length > 0) {
                this.selectedColumnId = data.columns[0].id;
            } else if (boardId === this.currentBoardId) {
                this.selectedColumnId = this.currentColumnId;
            }
            this.isLoadingColumns.set(false);
        });
    }

    onBoardChange(boardId: string) {
        this.selectedBoardId = boardId;
        this.loadColumns(boardId);
    }

    onColumnChange(colId: string) {
        this.selectedColumnId = colId;
    }

    isValid() {
        return this.selectedBoardId && this.selectedColumnId;
    }

    submit() {
        this.isSubmitting.set(true);
        if (this.action === 'move') {
            this.boardService.moveCard(this.card.id, {
                column_id: this.selectedColumnId,
                position: this.selectedPosition
            }).subscribe({
                next: () => {
                    this.completed.emit();
                    this.close.emit();
                },
                error: () => this.isSubmitting.set(false)
            });
        } else {
            this.boardService.copyCard(this.card.id, this.selectedColumnId).subscribe({
                next: () => { // Copy usually puts at bottom by default in our backend impl
                    this.completed.emit();
                    this.close.emit();
                },
                error: () => this.isSubmitting.set(false)
            });
        }
    }
}
