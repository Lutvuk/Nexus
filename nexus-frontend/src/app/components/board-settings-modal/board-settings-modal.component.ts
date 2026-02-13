import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { CustomFieldManagerComponent } from '../custom-field-manager/custom-field-manager.component';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-board-settings-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, CustomFieldManagerComponent],
    templateUrl: './board-settings-modal.component.html'
})
export class BoardSettingsModalComponent {
    @Input({ required: true }) boardId!: string;
    @Input() set currentTitle(val: string) { this.title = val; }
    @Input() set currentBgColor(val: string | undefined) { if (val) this.selectedBg = val; }
    @Input() set currentBgImage(val: string | undefined) { if (val) this.selectedImage = val; }
    @Input() set currentDocumentationNotes(val: string | undefined) { this.applyIncomingNotes(val); }

    @Output() close = new EventEmitter<void>();

    title = '';
    selectedBg = '#1e293b';
    selectedImage = '';
    uploadingBackground = false;

    // UI State
    activeTab: 'general' | 'fields' | 'docs' = 'general';

    notes: BoardDocumentationNote[] = [];
    selectedNoteId: string | null = null;
    noteTitle = '';
    noteContent = '';
    isSavingNote = false;

    private boardService = inject(BoardService);
    private toast = inject(ToastService);

    presets = [
        '#1e293b', '#0f172a', '#1e3a8a', '#4c1d95', '#881337', '#14532d', '#7c2d12', // Solid
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Plum Plate
        'linear-gradient(135deg, #6B73FF 0%, #000DFF 100%)', // Blue
        'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', // Pink
    ];
    imagePresets = [
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    ];

    onBackgroundSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.uploadingBackground = true;
        this.boardService.uploadBoardBackground(this.boardId, file).subscribe({
            next: (res) => {
                this.selectedImage = res.background_image_url;
                this.selectedBg = '';
                this.uploadingBackground = false;
            },
            error: () => {
                this.uploadingBackground = false;
                this.toast.show('Failed to upload background', 'error');
            }
        });
    }

    save() {
        this.boardService.updateBoard(this.boardId, {
            title: this.title,
            background_color: this.selectedBg,
            background_image_url: this.selectedImage
        }).subscribe(() => {
            this.boardService.triggerRefresh();
            this.close.emit();
        });
    }

    createNote() {
        const now = new Date().toISOString();
        const note: BoardDocumentationNote = {
            id: crypto.randomUUID(),
            title: 'Untitled note',
            content: '',
            updatedAt: now
        };

        this.notes = [note, ...this.notes];
        this.selectNote(note.id);
        this.persistNotes('Note created');
    }

    selectNote(noteId: string) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;
        this.selectedNoteId = note.id;
        this.noteTitle = note.title;
        this.noteContent = note.content;
    }

    saveCurrentNote() {
        if (!this.selectedNoteId) {
            this.createNote();
        }

        const targetId = this.selectedNoteId;
        if (!targetId) return;

        const now = new Date().toISOString();
        this.notes = this.notes
            .map(note => note.id === targetId
                ? {
                    ...note,
                    title: this.noteTitle.trim() || 'Untitled note',
                    content: this.noteContent.trim(),
                    updatedAt: now
                }
                : note
            )
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

        this.persistNotes('Note saved');
    }

    deleteCurrentNote() {
        if (!this.selectedNoteId) return;
        const deletingId = this.selectedNoteId;
        this.notes = this.notes.filter(note => note.id !== deletingId);
        this.persistNotes('Note deleted');

        if (this.notes.length > 0) {
            this.selectNote(this.notes[0].id);
        } else {
            this.selectedNoteId = null;
            this.noteTitle = '';
            this.noteContent = '';
        }

    }

    hasSelectedNote(): boolean {
        return !!this.selectedNoteId;
    }

    getSelectedNoteUpdatedAt(): string | null {
        if (!this.selectedNoteId) return null;
        const note = this.notes.find(n => n.id === this.selectedNoteId);
        return note?.updatedAt || null;
    }

    private applyIncomingNotes(raw?: string) {
        if (!raw) {
            this.notes = [];
            this.selectedNoteId = null;
            this.noteTitle = '';
            this.noteContent = '';
            return;
        }

        try {
            const parsed = JSON.parse(raw) as BoardDocumentationNote[];
            this.notes = Array.isArray(parsed)
                ? parsed
                    .filter(n => n && typeof n.id === 'string')
                    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
                : [];
        } catch {
            this.notes = [];
        }

        if (this.notes.length > 0) {
            this.selectNote(this.notes[0].id);
        } else {
            this.selectedNoteId = null;
            this.noteTitle = '';
            this.noteContent = '';
        }
    }

    private persistNotes(successMessage: string) {
        if (!this.boardId) return;
        this.isSavingNote = true;
        this.boardService.updateBoard(this.boardId, {
            documentation_notes: JSON.stringify(this.notes)
        }, { silent: true }).subscribe({
            next: () => {
                this.isSavingNote = false;
                this.boardService.triggerRefresh();
                this.toast.show(successMessage, 'success');
            },
            error: () => {
                this.isSavingNote = false;
                this.toast.show('Failed to save note changes', 'error');
            }
        });
    }
}

interface BoardDocumentationNote {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
}
