import { Component, inject, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterOutlet, Router } from '@angular/router';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { BoardService } from '../../services/board.service';
import { DialogService } from '../../services/dialog.service';
import { CardService } from '../../services/card.service';
import { WebSocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem, CdkDropListGroup, CdkDropList } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Card } from '../../models/board.model';
import { NexusColumnComponent } from '../nexus-column/nexus-column.component';
import { ShareModalComponent } from '../share-modal/share-modal.component';
import { FilterDropdownComponent } from '../filter-dropdown/filter-dropdown.component';
import { NexusSkeletonComponent } from '../nexus-skeleton/nexus-skeleton.component';
import { BoardActivitySidebarComponent } from '../board-activity-sidebar/board-activity-sidebar.component';
import { ArchiveExplorerComponent } from '../archive-explorer/archive-explorer.component';
import { ViewSwitcherComponent, BoardViewType } from '../view-switcher/view-switcher.component';
import { TableViewComponent } from '../board-views/table-view/table-view.component';
import { CalendarViewComponent } from '../board-views/calendar-view/calendar-view.component';
import { AnalyticsViewComponent } from '../board-views/analytics-view/analytics-view.component';
import { PlannerViewComponent } from '../board-views/planner-view/planner-view.component';
import { BoardSettingsModalComponent } from '../board-settings-modal/board-settings-modal.component';
import { CardDetailComponent } from '../card-detail/card-detail.component';
import { AutomationRulesComponent } from '../automation-rules/automation-rules.component';
import { PreferencesService } from '../../services/preferences.service';

@Component({
  selector: 'app-nexus-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, CdkDropListGroup, CdkDropList, NexusColumnComponent, NexusSkeletonComponent, FormsModule, RouterLink, RouterOutlet, BoardActivitySidebarComponent, ArchiveExplorerComponent, ShareModalComponent, FilterDropdownComponent, ViewSwitcherComponent, TableViewComponent, CalendarViewComponent, AnalyticsViewComponent, PlannerViewComponent, BoardSettingsModalComponent, CardDetailComponent, AutomationRulesComponent],
  templateUrl: './nexus-board.component.html',
  styleUrl: './nexus-board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NexusBoardComponent implements OnInit, OnDestroy {

  private boardService = inject(BoardService);
  private cardService = inject(CardService);
  private dialogService = inject(DialogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private subscriptions = new Subscription();

  // Filtering State
  searchQuery = signal('');
  selectedLabelIds = signal<Set<string>>(new Set());
  selectedMemberIds = signal<Set<string>>(new Set());
  activeFilters = signal<Set<string>>(new Set());
  collapseEmpty = signal(false);
  filterKeyword = signal('');

  private authService = inject(AuthService);
  private preferencesService = inject(PreferencesService);
  showBoardSuggestionHint = signal(true);
  showEmptyBoardHint = signal(true);
  suggestionsEnabled = computed(() => this.preferencesService.preferences()?.enable_suggestions !== false);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.preferencesService.preferences()?.disable_keyboard_shortcuts) {
      return;
    }

    // Only trigger if no input/textarea is focused, OR if specific keys are pressed
    const activeElement = document.activeElement as HTMLElement;
    const isInputFocused = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';

    if (isInputFocused && event.key !== 'Escape') return;

    switch (event.key) {
      case 'f':
        event.preventDefault();
        this.searchInput?.nativeElement?.focus();
        break;
      case 'c':
        event.preventDefault();
        this.openAddColumn();
        break;
      case 'Esc':
      case 'Escape':
        if (isInputFocused) {
          activeElement.blur();
        } else {
          this.closeSidebars();
          this.showFilterDropdown.set(false);
          this.showShareModal.set(false);
        }
        break;
    }
  }

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  board = signal<any>(null);
  selectedCardId = signal<string | null>(null);

  // Computed signal for filtered board data
  filteredBoard = computed(() => {
    const rawBoard = this.board();
    const query = this.searchQuery().toLowerCase().trim();
    const keyword = this.filterKeyword().toLowerCase().trim();
    const labelIds = this.selectedLabelIds();
    const memberIds = this.selectedMemberIds();
    const filters = this.activeFilters();
    const collapse = this.collapseEmpty();

    if (!rawBoard) return null;

    const currentUserId = this.authService.currentUser()?.id;
    const now = new Date();
    const hasAnyFilter = query || keyword || labelIds.size > 0 || memberIds.size > 0 || filters.size > 0;

    if (!hasAnyFilter) return rawBoard;

    const searchTerm = query || keyword;

    const filteredColumns = rawBoard.columns.map((column: any) => {
      const filteredCards = column.cards.filter((card: any) => {
        // Search by title or description
        const matchesQuery = !searchTerm ||
          card.title.toLowerCase().includes(searchTerm) ||
          (card.description?.toLowerCase()?.includes(searchTerm) ?? false);

        // Filter by labels
        let matchesLabels = true;
        if (labelIds.size > 0 || filters.has('noLabels')) {
          const hasNoLabels = !card.labels || card.labels.length === 0;
          const matchesSpecificLabel = labelIds.size > 0 && card.labels?.some((l: any) => labelIds.has(l.id));
          matchesLabels = (filters.has('noLabels') && hasNoLabels) || matchesSpecificLabel;
          if (!filters.has('noLabels') && labelIds.size === 0) matchesLabels = true;
        }

        // Filter by members
        let matchesMembers = true;
        if (memberIds.size > 0 || filters.has('noMembers') || filters.has('assignedToMe')) {
          const hasNoMembers = !card.members || card.members.length === 0;
          const matchesSpecificMember = memberIds.size > 0 && card.members?.some((m: any) => memberIds.has(m.id));
          const isAssignedToMe = filters.has('assignedToMe') && card.members?.some((m: any) => m.id === currentUserId);
          matchesMembers = (filters.has('noMembers') && hasNoMembers) || matchesSpecificMember || isAssignedToMe;
          if (!filters.has('noMembers') && !filters.has('assignedToMe') && memberIds.size === 0) matchesMembers = true;
        }

        // Filter by card status
        let matchesStatus = true;
        if (filters.has('markedComplete') || filters.has('notComplete')) {
          const isComplete = !!card.is_complete;
          matchesStatus = (filters.has('markedComplete') && isComplete) || (filters.has('notComplete') && !isComplete);
        }

        // Filter by due date
        let matchesDueDate = true;
        const dueDateFilters = ['noDates', 'overdue', 'dueNextDay', 'dueNextWeek', 'dueNextMonth'];
        const activeDueDateFilters = dueDateFilters.filter(f => filters.has(f));
        if (activeDueDateFilters.length > 0) {
          const hasDueDate = !!card.due_date;
          const dueDate = hasDueDate ? new Date(card.due_date) : null;

          matchesDueDate = activeDueDateFilters.some(f => {
            switch (f) {
              case 'noDates': return !hasDueDate;
              case 'overdue': return hasDueDate && dueDate! < now && !card.is_complete;
              case 'dueNextDay': return hasDueDate && dueDate! >= now && (dueDate!.getTime() - now.getTime()) < 86400000;
              case 'dueNextWeek': return hasDueDate && dueDate! >= now && (dueDate!.getTime() - now.getTime()) < 604800000;
              case 'dueNextMonth': return hasDueDate && dueDate! >= now && (dueDate!.getTime() - now.getTime()) < 2592000000;
              default: return true;
            }
          });
        }

        // Filter by activity
        let matchesActivity = true;
        const activityFilters = ['activeLastWeek', 'activeLast2Weeks', 'activeLast4Weeks', 'notActive4Weeks'];
        const activeActivityFilters = activityFilters.filter(f => filters.has(f));
        if (activeActivityFilters.length > 0) {
          const updatedAt = card.updated_at ? new Date(card.updated_at) : null;
          const diffMs = updatedAt ? now.getTime() - updatedAt.getTime() : Infinity;
          const oneWeek = 604800000;

          matchesActivity = activeActivityFilters.some(f => {
            switch (f) {
              case 'activeLastWeek': return diffMs < oneWeek;
              case 'activeLast2Weeks': return diffMs < oneWeek * 2;
              case 'activeLast4Weeks': return diffMs < oneWeek * 4;
              case 'notActive4Weeks': return diffMs >= oneWeek * 4;
              default: return true;
            }
          });
        }

        return matchesQuery && matchesLabels && matchesMembers && matchesStatus && matchesDueDate && matchesActivity;
      });

      return {
        ...column,
        cards: filteredCards,
        card_count: filteredCards.length,
        _collapsed: collapse && filteredCards.length === 0 && hasAnyFilter
      };
    });

    return {
      ...rawBoard,
      columns: filteredColumns
    };
  });

  columnIds = computed(() => this.filteredBoard()?.columns?.map((c: any) => c.id) || []);
  dropListIds = computed(() => [...this.columnIds(), 'archived-drop-list']);
  isLoading = signal(false);
  showArchivedSidebar = signal(false);
  showShareModal = signal(false);
  showFilterDropdown = signal(false);

  // View State
  currentView = signal<BoardViewType>('BOARD');

  // Activity Sidebar
  showActivitySidebar = signal(false);

  hasActiveFilters = computed(() => {
    return this.selectedLabelIds().size > 0 || this.selectedMemberIds().size > 0 || this.activeFilters().size > 0 || this.filterKeyword().length > 0;
  });

  boardBackgroundStyle = computed(() => {
    const b = this.board();
    if (!b) return {};

    // If we have an image
    if (b.background_image_url) {
      return {
        'background-image': `url(${b.background_image_url})`,
        'background-size': 'cover',
        'background-position': 'center',
        'color': 'white' // Ensure text is readable
      };
    }

    // If we have a color
    if (b.background_color) {
      return { 'background': b.background_color };
    }

    return {
      'background-image': 'linear-gradient(140deg, #1f2a44 0%, #1a1f36 35%, #0f1730 100%)',
      'background-size': 'cover',
      'background-position': 'center'
    };
  });

  showBoardSettings = signal(false);
  showAutomationRules = signal(false);
  cardTemplates = signal<any[]>([]);

  loadCardTemplates(boardId: string) {
    this.boardService.getCardTemplates(boardId).subscribe(templates => {
      this.cardTemplates.set(templates);
    });
  }

  toggleAutomationRules() {
    this.showAutomationRules.update(v => !v);
  }

  openBoardSettings() {
    this.showBoardSettings.set(true);
  }

  closeBoardSettings() {
    this.showBoardSettings.set(false);
  }

  toggleFilterDropdown() {
    this.showFilterDropdown.update(v => !v);
  }

  onFilterChanged() {
    // Trigger signal updates to re-run computed filteredBoard
    this.selectedLabelIds.update(s => new Set(s));
    this.selectedMemberIds.update(s => new Set(s));
    this.activeFilters.update(s => new Set(s));
  }

  onCollapseChanged(collapse: boolean) {
    this.collapseEmpty.set(collapse);
  }

  onKeywordChanged(keyword: string) {
    this.filterKeyword.set(keyword);
  }

  private isDragging = false;
  private dropCooldown = false; // Suppress WS refreshes right after a local drop
  private currentBoardId: string | null = null;
  private refreshTrigger$ = new Subject<string>();

  constructor() { }

  ngOnInit() {
    this.showBoardSuggestionHint.set(!this.preferencesService.isSuggestionDismissed('board_quick_tip'));
    this.showEmptyBoardHint.set(!this.preferencesService.isSuggestionDismissed('board_empty_state'));

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadBoard(id);
      }
    });

    // Listen for query params to open card detail
    this.route.queryParams.subscribe(params => {
      const cardId = params['card'];
      if (cardId) {
        this.selectedCardId.set(cardId);
      } else {
        this.selectedCardId.set(null);
      }
    });
  }

  closeCardDetail() {
    this.selectedCardId.set(null);
    // Remove query param
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { card: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  loadBoard(id: string) {
    if (this.currentBoardId === id && this.board()) {
      return; // Skip if already loaded
    }
    this.currentBoardId = id;

    // 1. Reset-on-Load pattern: clear old data immediately
    this.board.set(null);
    this.isLoading.set(true);

    // 2. Clear previous board-specific subscriptions to prevent ghost listeners
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    // Connect WebSocket
    this.wsService.connect(id);
    const wsSub = this.wsService.onEvent('CARD_MOVED').subscribe((data) => {
      console.log('[Board] Received CARD_MOVED:', data, 'isDragging:', this.isDragging);
      setTimeout(() => this.refreshTrigger$.next(id), 150);
      if (this.showArchivedSidebar()) {
        setTimeout(() => this.loadArchivedCards(), 200);
      }
    });
    this.subscriptions.add(wsSub);

    const colMoveSub = this.wsService.onEvent('COLUMN_MOVED').subscribe(() => {
      this.refreshTrigger$.next(id);
    });
    this.subscriptions.add(colMoveSub);

    const colCreateSub = this.wsService.onEvent('COLUMN_CREATED').subscribe(() => {
      this.refreshTrigger$.next(id);
    });
    this.subscriptions.add(colCreateSub);

    const colUpdateSub = this.wsService.onEvent('COLUMN_UPDATED').subscribe(() => {
      this.refreshTrigger$.next(id);
    });
    this.subscriptions.add(colUpdateSub);

    const colDeleteSub = this.wsService.onEvent('COLUMN_DELETED').subscribe(() => {
      this.refreshTrigger$.next(id);
    });
    this.subscriptions.add(colDeleteSub);

    // Listen for card creation (including from templates)
    const cardCreateSub = this.wsService.onEvent('CARD_CREATED').subscribe((data) => {
      console.log('[Board] Received CARD_CREATED:', data);
      this.refreshTrigger$.next(id);
      if (this.showArchivedSidebar()) {
        setTimeout(() => this.loadArchivedCards(), 200);
      }
    });
    this.subscriptions.add(cardCreateSub);

    // Listen for template list updates
    const templatesUpdateSub = this.wsService.onEvent('TEMPLATES_UPDATED').subscribe((data) => {
      console.log('[Board] Received TEMPLATES_UPDATED:', data);
      this.loadCardTemplates(id);
    });
    this.subscriptions.add(templatesUpdateSub);

    // Listen for generic card updates (Label, Member, Checklist, Details)
    const cardUpdateSub = this.wsService.onEvent('CARD_UPDATED').subscribe((data) => {
      console.log('[Board] Received CARD_UPDATED:', data);
      this.refreshTrigger$.next(id);
      if (this.showArchivedSidebar()) {
        setTimeout(() => this.loadArchivedCards(), 200);
      }
    });
    this.subscriptions.add(cardUpdateSub);

    const boardUpdateSub = this.wsService.onEvent('BOARD_UPDATED').subscribe((data: any) => {
      if (!data?.board_id || data.board_id === id) {
        this.refreshTrigger$.next(id);
      }
    });
    this.subscriptions.add(boardUpdateSub);

    // Listen for same-session refresh (e.g., when card detail modal closes)
    const refreshNeededSub = this.boardService.refreshNeeded$.subscribe(() => {
      console.log('[Board] Received refreshNeeded, refreshing board:', id);
      this.refreshBoard(id);  // Direct call, bypass debounce
    });
    this.subscriptions.add(refreshNeededSub);

    // Debounced refresh (don't refresh while dragging)
    const refreshSub = this.refreshTrigger$.pipe(
      debounceTime(300),
      filter(() => !this.isDragging)
    ).subscribe(boardId => this.refreshBoard(boardId));
    this.subscriptions.add(refreshSub);

    const boardSub = this.boardService.getBoardById(id).subscribe({
      next: (data) => {
        this.board.set({
          ...data.board,
          columns: data.columns
        });
        if (data?.board?.workspace_id) {
          localStorage.setItem('nexus_active_workspace_id', data.board.workspace_id);
        }
        this.boardService.userRole.set(data.user_role);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
    this.subscriptions.add(boardSub);

    this.loadCardTemplates(id);
  }

  refreshBoard(id: string) {
    console.log('[Board] refreshBoard called for:', id, 'isDragging:', this.isDragging);
    this.boardService.getBoardById(id).subscribe(data => {
      console.log('[Board] refreshBoard got data, columns:', data.columns?.length, 'cards:', data.columns?.map((c: any) => c.cards?.length));
      this.board.set({ ...data.board, columns: data.columns });
      this.boardService.userRole.set(data.user_role);
    });
  }

  toggleStar() {
    const currentBoard = this.board();
    if (!currentBoard) return;

    this.boardService.toggleBoardStar(currentBoard.id).subscribe({
      next: (updatedBoard) => {
        this.board.set({
          ...currentBoard,
          is_starred: updatedBoard.is_starred
        });
      }
    });
  }

  toggleActivitySidebar() {
    this.showActivitySidebar.update(v => !v);
    if (this.showActivitySidebar()) {
      this.showArchivedSidebar.set(false);
    }
  }

  closeSidebars() {
    this.showActivitySidebar.set(false);
    this.showArchivedSidebar.set(false);
  }

  toggleArchivedSidebar() {
    this.showArchivedSidebar.update(v => !v);
    if (this.showArchivedSidebar()) {
      this.showActivitySidebar.set(false);
      this.loadArchivedCards();
    }
  }

  archivedCards = signal<any[]>([]);

  loadArchivedCards() {
    const currentBoard = this.board();
    if (!currentBoard) return;
    this.boardService.getArchivedCards(currentBoard.id).subscribe(cards => {
      this.archivedCards.set(cards);
    });
  }

  restoreCard(card: any) {
    const currentBoard = this.board();
    if (!currentBoard) return;
    const columnId = currentBoard.columns[0]?.id;
    if (!columnId) return;

    this.boardService.restoreCard(card.id, columnId).subscribe(() => {
      this.loadArchivedCards();
      this.refreshBoard(currentBoard.id);
    });
  }



  openShareModal() {
    this.showShareModal.set(true);
  }

  closeShareModal() {
    this.showShareModal.set(false);
  }

  isCreating = false;

  async openAddColumn() {
    const currentBoard = this.board();
    if (!currentBoard) return;

    const name = await this.dialogService.openPrompt({
      title: 'Add New Column',
      promptLabel: 'Column Name',
      promptValue: '',
      confirmLabel: 'Create Column',
      type: 'prompt'
    });

    if (name) {
      this.isCreating = true;
      this.boardService.createColumn(name, currentBoard.id).subscribe({
        next: () => {
          this.isCreating = false;
          this.refreshBoard(currentBoard.id);
        },
        error: () => this.isCreating = false
      });
    }
  }

  drop(payload: { event: CdkDragDrop<Card[]>; columnId: string }) {
    const event = payload.event;
    // Keep isDragging = true to suppress WebSocket refreshes until API completes
    const newColumnId = payload.columnId;
    const fromArchive = event.previousContainer?.id === 'archived-drop-list';

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      const newPos = this.calculateMidpoint(event.container.data, event.currentIndex);
      const card = event.container.data[event.currentIndex];
      this.boardService.moveCard(card.id, { column_id: newColumnId, position: newPos }).subscribe({
        next: () => {
          this.onDragEnded();
          // Controlled refresh after API confirms
          if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
          if (this.showArchivedSidebar()) this.loadArchivedCards();
        },
        error: () => {
          this.onDragEnded();
          if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
          if (this.showArchivedSidebar()) this.loadArchivedCards();
        }
      });
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      const newPos = this.calculateMidpoint(event.container.data, event.currentIndex);
      const card = event.container.data[event.currentIndex];
      if (fromArchive) {
        // Restoring from archive requires explicit unarchive semantics on backend.
        this.boardService.restoreCard(card.id, newColumnId).subscribe({
          next: () => {
            this.boardService.moveCard(card.id, {
              column_id: newColumnId,
              position: newPos
            }).subscribe({
              next: () => {
                this.onDragEnded();
                if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
                if (this.showArchivedSidebar()) this.loadArchivedCards();
              },
              error: () => {
                this.onDragEnded();
                if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
                if (this.showArchivedSidebar()) this.loadArchivedCards();
              }
            });
          },
          error: () => {
            this.onDragEnded();
            if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
            if (this.showArchivedSidebar()) this.loadArchivedCards();
          }
        });
      } else {
        this.boardService.moveCard(card.id, {
          column_id: newColumnId,
          position: newPos
        }).subscribe({
          next: () => {
            this.onDragEnded();
            if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
            if (this.showArchivedSidebar()) this.loadArchivedCards();
          },
          error: () => {
            this.onDragEnded();
            if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
            if (this.showArchivedSidebar()) this.loadArchivedCards();
          }
        });
      }
    }
  }

  dismissBoardSuggestionHint() {
    this.showBoardSuggestionHint.set(false);
    this.preferencesService.dismissSuggestion('board_quick_tip');
  }

  dismissEmptyBoardHint() {
    this.showEmptyBoardHint.set(false);
    this.preferencesService.dismissSuggestion('board_empty_state');
  }

  async addFirstCardQuick() {
    const currentBoard = this.board();
    const firstColumn = currentBoard?.columns?.[0];
    if (!currentBoard || !firstColumn) return;

    const title = await this.dialogService.openPrompt({
      title: 'Add First Card',
      promptLabel: 'Card Title',
      promptValue: '',
      confirmLabel: 'Create Card',
      type: 'prompt'
    });

    if (!title) return;
    this.boardService.createCard(firstColumn.id, title).subscribe({
      next: () => this.refreshBoard(currentBoard.id)
    });
  }

  dropToArchive(event: CdkDragDrop<Card[]>) {
    if (event.previousContainer === event.container) {
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    const card = event.container.data[event.currentIndex];
    if (!card?.id) {
      if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
      this.loadArchivedCards();
      return;
    }

    this.boardService.archiveCard(card.id).subscribe({
      next: () => {
        if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
        this.loadArchivedCards();
      },
      error: () => {
        if (this.currentBoardId) this.refreshBoard(this.currentBoardId);
        this.loadArchivedCards();
      }
    });
  }

  dropColumn(event: CdkDragDrop<any[]>) {
    this.onDragEnded();

    const columns = this.board().columns;
    moveItemInArray(columns, event.previousIndex, event.currentIndex);

    this.board.set({ ...this.board(), columns: [...columns] });

    const newPos = this.calculateMidpoint(columns, event.currentIndex);
    const column = columns[event.currentIndex];
    this.boardService.moveColumn(column.id, newPos).subscribe();
  }

  private calculateMidpoint(items: any[], index: number): number {
    const prev = items[index - 1];
    const next = items[index + 1];
    const step = 16384.0;

    if (prev && next) {
      return (prev.position + next.position) / 2;
    } else if (prev) {
      return prev.position + step;
    } else if (next) {
      return next.position / 2;
    } else {
      return step;
    }
  }

  onDragStarted() {
    this.isDragging = true;
  }

  onDragEnded() {
    this.isDragging = false;
    this.dropCooldown = false;
  }

  private wsService = inject(WebSocketService);



  async deletePermanently(card: any) {
    const confirmed = await this.dialogService.openConfirm({
      title: 'Delete Card Permanently?',
      message: `Card "${card?.title || 'Untitled'}" will be deleted and cannot be restored.`,
      confirmLabel: 'Delete',
      isDanger: true,
      type: 'confirm'
    });
    if (!confirmed) return;

    this.cardService.deleteCard(card.id).subscribe(() => {
      this.loadArchivedCards();
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.wsService.disconnect();
  }
}
