import { Component, Input, ChangeDetectionStrategy, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Card } from '../../models/board.model';
import { BoardService } from '../../services/board.service';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-nexus-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nexus-card.component.html',
  styleUrl: './nexus-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NexusCardComponent {
  private boardService = inject(BoardService);
  private dialogService = inject(DialogService);

  @Input({ required: true }) card!: Card;

  isEditing = false;
  editedTitle = '';
  isBusy = false;

  // --- Edit Mode ---

  enableEdit() {
    this.editedTitle = this.card.title;
    this.isEditing = true;
    // Focus logic usually handled by autoFocus directive or separate ViewChild logic.
    // HTML 'autoFocus' attribute works well with *ngIf.
  }

  saveEdit() {
    if (!this.isEditing) return;
    const cleanTitle = this.editedTitle.trim();

    if (!cleanTitle || cleanTitle === this.card.title) {
      this.cancelEdit();
      return;
    }

    // Optimistic / Busy state
    // We could optimistically update local card, but OnPush + Immutability makes it tricky 
    // without Signal input or Service update.
    // For MVP, we'll just wait for API.

    this.boardService.updateCard(this.card.id, { title: cleanTitle }).subscribe({
      next: () => {
        // ideally update local state or signal
        this.card = { ...this.card, title: cleanTitle }; // Local mutation for responsiveness
        this.isEditing = false;
      },
      error: () => {
        this.cancelEdit(); // Revert on error
      }
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.editedTitle = '';
  }

  // --- Delete ---

  async deleteCard() {
    const confirmed = await this.dialogService.openConfirm({
      title: 'Delete Task?',
      message: 'Are you sure you want to delete this task?',
      confirmLabel: 'Delete',
      isDanger: true,
      type: 'confirm'
    });

    if (confirmed) {
      this.isBusy = true;
      this.boardService.deleteCard(this.card.id).subscribe({
        next: () => {
          this.isBusy = false;
          window.location.reload();
        },
        error: () => this.isBusy = false
      });
    }
  }
}
