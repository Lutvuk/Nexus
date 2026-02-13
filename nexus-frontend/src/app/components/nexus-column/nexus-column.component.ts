import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Column, Card } from '../../models/board.model';
import { NexusCardComponent } from '../nexus-card/nexus-card.component';
import { BoardService } from '../../services/board.service';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-nexus-column',
  standalone: true,
  imports: [CommonModule, DragDropModule, ScrollingModule, NexusCardComponent, FormsModule],
  templateUrl: './nexus-column.component.html',
  styleUrl: './nexus-column.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NexusColumnComponent {
  private boardService = inject(BoardService);
  private dialogService = inject(DialogService);
  @Input({ required: true }) column!: Column;
  @Input() wipLimit = 5;
  @Input() connectedTo: string[] = []; // IDs of other columns to connect to
  @Input() cardTemplates: any[] = [];
  @Output() cardDropped = new EventEmitter<{ event: CdkDragDrop<Card[]>; columnId: string }>();
  @Output() dragStarted = new EventEmitter<void>();
  @Output() dragEnded = new EventEmitter<void>();

  // UI State
  isBusy = false;
  isEditingName = false;
  editedName = '';
  showTemplatePicker = false;
  isCollapsed = false;
  showColumnMenu = false;

  isOverWipLimit(): boolean {
    return (this.column?.cards?.length || 0) > this.wipLimit;
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  useTemplate(template: any) {
    this.isBusy = true;
    this.boardService.createCard(this.column.id, template.title, template.id).subscribe({
      next: () => {
        this.isBusy = false;
        this.showTemplatePicker = false;
        this.boardService.triggerRefresh();
      },
      error: () => {
        this.isBusy = false;
        this.showTemplatePicker = false;
      }
    });
  }

  drop(event: CdkDragDrop<Card[]>) {
    this.dragEnded.emit();
    this.cardDropped.emit({ event, columnId: this.column.id });
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
          this.boardService.triggerRefresh();
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
          this.boardService.triggerRefresh();
        },
        error: () => this.isBusy = false
      });
    }
  }

  // --- Inline Edit ---

  enableNameEdit() {
    this.editedName = this.column.name;
    this.isEditingName = true;
  }

  saveNameEdit() {
    if (!this.isEditingName) return;
    const newName = this.editedName.trim();
    if (!newName || newName === this.column.name) {
      this.cancelNameEdit();
      return;
    }

    this.boardService.updateColumn(this.column.id, newName).subscribe({
      next: () => {
        this.column = { ...this.column, name: newName };
        this.isEditingName = false;
      },
      error: () => this.cancelNameEdit()
    });
  }

  cancelNameEdit() {
    this.isEditingName = false;
  }
}
