import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardService } from '../../services/card.service';
import { BoardService } from '../../services/board.service';
import { User } from '../../services/user.service';
import { toBackendUrl } from '../../core/runtime-config';

@Component({
  selector: 'app-member-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './member-picker.component.html',
})
export class MemberPickerComponent {
  @Input({ required: true }) cardId!: string;
  @Input({ required: true }) boardId!: string;
  @Input() activeMemberIds: string[] = []; // IDs of members currently on the card
  @Output() memberToggled = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  private cardService = inject(CardService);
  private boardService = inject(BoardService);

  searchQuery = '';
  workspaceMembers = signal<User[]>([]);
  isLoading = signal(false);

  searchResults = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();
    const members = this.workspaceMembers();
    if (!query) return members;
    return members.filter(user =>
      (user.name || '').toLowerCase().includes(query) ||
      (user.email || '').toLowerCase().includes(query)
    );
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['boardId'] && this.boardId) {
      this.loadWorkspaceMembers();
    }
  }

  private loadWorkspaceMembers() {
    if (!this.boardId) return;
    this.isLoading.set(true);
    this.boardService.getBoardById(this.boardId).subscribe({
      next: (boardData: any) => {
        const workspaceId = boardData?.board?.workspace_id;
        if (!workspaceId) {
          this.workspaceMembers.set([]);
          this.isLoading.set(false);
          return;
        }
        this.boardService.getWorkspaceMembers(workspaceId).subscribe({
          next: (members: any[]) => {
            this.workspaceMembers.set(
              (members || [])
                .map(m => m.user || m)
                .filter((u: any) => !!u?.id)
            );
            this.isLoading.set(false);
          },
          error: () => {
            this.workspaceMembers.set([]);
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.workspaceMembers.set([]);
        this.isLoading.set(false);
      }
    });
  }

  onSearch(query: string) {
    this.searchQuery = query;
  }

  toggleMember(user: User) {
    const isActive = this.activeMemberIds.includes(user.id);
    if (isActive) {
      this.cardService.removeMember(this.cardId, user.id).subscribe(() => {
        this.memberToggled.emit(user.id);
      });
    } else {
      this.cardService.addMember(this.cardId, user.id).subscribe(() => {
        this.memberToggled.emit(user.id);
      });
    }
  }

  resolveAvatarUrl(url?: string): string {
    return toBackendUrl(url);
  }
}
