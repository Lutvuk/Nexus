import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { Column, Card } from '../../models/board.model';
import { NexusCardComponent } from '../nexus-card/nexus-card.component';
import { BoardService } from '../../services/board.service';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-nexus-column',
  standalone: true,
  imports: [CommonModule, DragDropModule, NexusCardComponent, FormsModule],
  templateUrl: './nexus-column.component.html',
  styleUrl: './nexus-column.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NexusColumnComponent {
  private boardService = inject(BoardService);
  private dialogService = inject(DialogService);
  @Input({ required: true }) column!: Column;
  @Output() cardDropped = new EventEmitter<CdkDragDrop<Card[]>>();

  // UI State
  isBusy = false;

  drop(event: CdkDragDrop<Card[]>) {
    this.cardDropped.emit(event);
  }

  // --- Actions ---

  async openAddTask() {
    const title = await this.dialogService.openPrompt({
      title: 'Add New Task',
      promptLabel: 'Task Title',
      promptValue: '',
      confirmLabel: 'Create Task',
      type: 'prompt'
    });

    if (title) {
      this.isBusy = true;
      this.boardService.createCard(this.column.id, title).subscribe({
        next: () => {
          this.isBusy = false;
          window.location.reload();
        },
        error: () => this.isBusy = false
      });
    }
  }

  async deleteColumn() {
    const confirmed = await this.dialogService.openConfirm({
      title: 'Delete Column?',
      message: `Are you sure you want to delete **${this.column.name}** and all its tasks?\nThis action cannot be undone.`,
      confirmLabel: 'Delete',
      isDanger: true,
      type: 'confirm'
    });

    if (confirmed) {
      this.isBusy = true;
      this.boardService.deleteColumn(this.column.id).subscribe({
        next: () => {
          this.isBusy = false;
          window.location.reload();
        },
        error: () => this.isBusy = false
      });
    }
  }
}
