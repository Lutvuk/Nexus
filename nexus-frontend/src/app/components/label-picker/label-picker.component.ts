import { Component, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LabelService } from '../../services/label.service';
import { CardService } from '../../services/card.service';
import { Label } from '../../models/label.model';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-label-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './label-picker.component.html',
  styles: [`
    .color-swatch {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      border: 2px solid transparent;
      &.selected {
        border-color: white;
        box-shadow: 0 0 0 2px #8B5CF6;
      }
    }
  `]
})
export class LabelPickerComponent {
  @Input({ required: true }) boardId!: string;
  @Input() cardId?: string; // If provided, we handle toggling
  @Input() activeLabelIds: string[] = []; // IDs of labels currently on the card
  @Output() labelToggled = new EventEmitter<string>(); // Emit label ID when toggled
  @Output() close = new EventEmitter<void>();

  private labelService = inject(LabelService);
  private cardService = inject(CardService);
  private dialogService = inject(DialogService);

  // Labels from store
  boardLabels = this.labelService.labels;

  // New Label Form
  newLabelName = '';
  selectedColor = '#EF4444'; // Default Red

  colors = [
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#64748B', // Slate
  ];

  constructor() {
    // Load labels if empty (or should simple call load in ngOnInit?)
    // Assuming parent loads or we load.
  }

  ngOnInit() {
    if (this.boardId && this.boardLabels().length === 0) {
      this.labelService.loadLabels(this.boardId);
    }
  }

  createLabel() {
    if (!this.newLabelName) return;

    this.labelService.createLabel(this.boardId, this.newLabelName, this.selectedColor).subscribe(() => {
      this.newLabelName = ''; // Reset
    });
  }

  toggleLabel(label: Label) {
    if (!this.cardId) return;

    const isActive = this.activeLabelIds.includes(label.id);
    if (isActive) {
      this.cardService.removeLabel(this.cardId, label.id).subscribe(() => {
        this.labelToggled.emit(label.id);
      });
    } else {
      this.cardService.addLabel(this.cardId, label.id).subscribe(() => {
        this.labelToggled.emit(label.id);
      });
    }
  }

  async deleteLabel(labelId: string, event: Event) {
    event.stopPropagation();

    const confirmed = await this.dialogService.openConfirm({
      title: 'Delete Label?',
      message: 'Cards using this label will lose it.',
      confirmLabel: 'Delete',
      isDanger: true,
      type: 'confirm'
    });
    if (!confirmed) return;

    this.labelService.deleteLabel(labelId).subscribe();
  }
}
