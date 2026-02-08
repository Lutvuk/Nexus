import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { DialogService } from '../../services/dialog.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Card, Column } from '../../models/board.model';
import { NexusColumnComponent } from '../nexus-column/nexus-column.component';

@Component({
  selector: 'app-nexus-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, NexusColumnComponent, FormsModule],
  templateUrl: './nexus-board.component.html',
  styleUrl: './nexus-board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NexusBoardComponent {
  private boardService = inject(BoardService);
  private dialogService = inject(DialogService);

  // Using toSignal for easier template consumption
  board = toSignal(this.boardService.getBoard());

  isCreating = false;

  async openAddColumn() {
    const name = await this.dialogService.openPrompt({
      title: 'Add New Column',
      promptLabel: 'Column Name',
      promptValue: '',
      confirmLabel: 'Create Column',
      type: 'prompt'
    });

    if (name) {
      this.isCreating = true;
      this.boardService.createColumn(name).subscribe({
        next: () => {
          this.isCreating = false;
          window.location.reload();
        },
        error: () => this.isCreating = false
      });
    }
  }

  drop(event: CdkDragDrop<Card[]>) {
    // 1. Reorder in same column
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

      // API Call (Optimistic)
      const card = event.container.data[event.currentIndex];
      this.boardService.moveCard(card.id, { position: event.currentIndex }).subscribe();
    }
    // 2. Move to different column
    else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // API Call (Optimistic)
      const card = event.container.data[event.currentIndex];
      // Find new Column ID from the container's ID or by searching the board (but container.id is a string, usually set to column.id if we bind it)
      // We need to bind [id]="column.id" in the nexus-column's drop list.
      // However, NexusColumnComponent has the cdkDropList, not this component directly.
      // So event.container.id will be the ID of the cdkDropList in NexusColumnComponent.

      // Let's ensure we get the right Column ID.
      // The event.container.id attribute comes from the cdkDropList.
      // So in NexusColumnComponent, we must bind [id]="column.id".

      const newColumnId = event.container.id;
      this.boardService.moveCard(card.id, {
        column_id: newColumnId,
        position: event.currentIndex
      }).subscribe();
    }
  }
}
