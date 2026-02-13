import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { LabelService } from '../../services/label.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-filter-dropdown',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="w-80 max-h-[80vh] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 pb-2 border-b border-white/5 shrink-0">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">Filter</h3>
            <div class="flex items-center gap-3">
                <button (click)="clearAll()" class="text-xs text-violet-400 hover:text-violet-300 font-medium">Clear all</button>
                <button (click)="close.emit()" class="text-white/40 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            </div>
        </div>

        <!-- Scrollable Content -->
        <div class="overflow-y-auto p-4 pt-3 space-y-5 custom-scrollbar flex-1">

            <!-- Keyword Search -->
            <div>
                <input type="text" [(ngModel)]="keyword" (ngModelChange)="onKeywordChange()"
                    placeholder="Enter a keyword..."
                    class="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500 transition-all">
                <p class="text-[10px] text-white/30 mt-1">Search cards, members, labels, and more.</p>
            </div>

            <!-- Members Section -->
            <div>
                <h4 class="text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">Members</h4>
                <div class="space-y-0.5">
                    <div (click)="toggleFilter('noMembers')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('noMembers')">
                            @if (activeFilters.has('noMembers')) { <span class="check-icon">✓</span> }
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-white/40"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        <span class="text-sm text-white/70">No members</span>
                    </div>
                    <div (click)="toggleFilter('assignedToMe')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('assignedToMe')">
                            @if (activeFilters.has('assignedToMe')) { <span class="check-icon">✓</span> }
                        </div>
                        <div class="h-5 w-5 rounded-full bg-violet-600 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                            {{ currentUserInitial }}
                        </div>
                        <span class="text-sm text-white/70">Cards assigned to me</span>
                    </div>
                    @for (member of workspaceMembers(); track member.user_id) {
                        <div (click)="toggleMember(member.user_id)"
                             class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                            <div class="filter-check" [class.active]="selectedMemberIds.has(member.user_id)">
                                @if (selectedMemberIds.has(member.user_id)) { <span class="check-icon">✓</span> }
                            </div>
                            <div class="h-5 w-5 rounded-full bg-violet-600 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                                {{ member.user?.name?.charAt(0) }}
                            </div>
                            <span class="text-sm text-white/70">{{ member.user?.name }}</span>
                        </div>
                    }
                </div>
            </div>

            <!-- Card Status -->
            <div>
                <h4 class="text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">Card status</h4>
                <div class="space-y-0.5">
                    <div (click)="toggleFilter('markedComplete')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('markedComplete')">
                            @if (activeFilters.has('markedComplete')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="text-sm text-white/70">Marked as complete</span>
                    </div>
                    <div (click)="toggleFilter('notComplete')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('notComplete')">
                            @if (activeFilters.has('notComplete')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="text-sm text-white/70">Not marked as complete</span>
                    </div>
                </div>
            </div>

            <!-- Due Date -->
            <div>
                <h4 class="text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">Due date</h4>
                <div class="space-y-0.5">
                    <div (click)="toggleFilter('noDates')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('noDates')">
                            @if (activeFilters.has('noDates')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/></svg>
                        </span>
                        <span class="text-sm text-white/70">No dates</span>
                    </div>
                    <div (click)="toggleFilter('overdue')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('overdue')">
                            @if (activeFilters.has('overdue')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 text-[8px] font-bold">!</span>
                        <span class="text-sm text-white/70">Overdue</span>
                    </div>
                    <div (click)="toggleFilter('dueNextDay')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('dueNextDay')">
                            @if (activeFilters.has('dueNextDay')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40"></span>
                        <span class="text-sm text-white/70">Due in the next day</span>
                    </div>
                    <div (click)="toggleFilter('dueNextWeek')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('dueNextWeek')">
                            @if (activeFilters.has('dueNextWeek')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="w-4 h-4 rounded-full bg-violet-500/20 border border-violet-500/40"></span>
                        <span class="text-sm text-white/70">Due in the next week</span>
                    </div>
                    <div (click)="toggleFilter('dueNextMonth')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('dueNextMonth')">
                            @if (activeFilters.has('dueNextMonth')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/40"></span>
                        <span class="text-sm text-white/70">Due in the next month</span>
                    </div>
                </div>
            </div>

            <!-- Labels Section -->
            <div>
                <h4 class="text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">Labels</h4>
                <div class="space-y-0.5">
                    <div (click)="toggleFilter('noLabels')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('noLabels')">
                            @if (activeFilters.has('noLabels')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="text-sm text-white/70">No labels</span>
                    </div>
                    @for (label of boardLabels(); track label.id) {
                        <div (click)="toggleLabel(label.id)"
                             class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                            <div class="filter-check" [class.active]="selectedLabelIds.has(label.id)">
                                @if (selectedLabelIds.has(label.id)) { <span class="check-icon">✓</span> }
                            </div>
                            <div class="h-6 flex-1 rounded" [style.background-color]="label.color">
                                <span class="text-xs font-semibold text-white px-2 leading-6">{{ label.name }}</span>
                            </div>
                        </div>
                    }
                </div>
            </div>

            <!-- Activity Section -->
            <div>
                <h4 class="text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">Activity</h4>
                <div class="space-y-0.5">
                    <div (click)="toggleFilter('activeLastWeek')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('activeLastWeek')">
                            @if (activeFilters.has('activeLastWeek')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="text-sm text-white/70">Active in the last week</span>
                    </div>
                    <div (click)="toggleFilter('activeLast2Weeks')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('activeLast2Weeks')">
                            @if (activeFilters.has('activeLast2Weeks')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="text-sm text-white/70">Active in the last two weeks</span>
                    </div>
                    <div (click)="toggleFilter('activeLast4Weeks')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('activeLast4Weeks')">
                            @if (activeFilters.has('activeLast4Weeks')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="text-sm text-white/70">Active in the last four weeks</span>
                    </div>
                    <div (click)="toggleFilter('notActive4Weeks')"
                         class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                        <div class="filter-check" [class.active]="activeFilters.has('notActive4Weeks')">
                            @if (activeFilters.has('notActive4Weeks')) { <span class="check-icon">✓</span> }
                        </div>
                        <span class="text-sm text-white/70">Without activity in the last four weeks</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Collapse Toggle (bottom, fixed) -->
        <div class="p-4 pt-3 border-t border-white/5 shrink-0">
            <div class="flex items-center justify-between">
                <span class="text-sm text-white/70">Collapse lists with no matching cards</span>
                <button (click)="toggleCollapse()" class="relative w-10 h-5 rounded-full transition-colors"
                    [ngClass]="collapseEmpty ? 'bg-violet-500' : 'bg-white/20'">
                    <span class="block w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                        [ngClass]="collapseEmpty ? 'left-[22px]' : 'left-0.5'"></span>
                </button>
            </div>
        </div>
    </div>
  `,
    styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
    .filter-check {
        width: 16px; height: 16px; border-radius: 4px;
        border: 1.5px solid rgba(255,255,255,0.2);
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
        flex-shrink: 0;
    }
    .filter-check.active {
        background: #7c3aed; border-color: #7c3aed;
    }
    .check-icon { font-size: 10px; color: white; font-weight: bold; }
  `]
})
export class FilterDropdownComponent implements OnInit {
    @Input({ required: true }) boardId!: string;
    @Input({ required: true }) workspaceId!: string;
    @Input() selectedLabelIds: Set<string> = new Set();
    @Input() selectedMemberIds: Set<string> = new Set();
    @Input() activeFilters: Set<string> = new Set();
    @Input() collapseEmpty = false;

    @Output() filterChanged = new EventEmitter<void>();
    @Output() collapseChanged = new EventEmitter<boolean>();
    @Output() keywordChanged = new EventEmitter<string>();
    @Output() close = new EventEmitter<void>();

    private boardService = inject(BoardService);
    private labelService = inject(LabelService);
    private authService = inject(AuthService);

    boardLabels = this.labelService.labels;
    workspaceMembers = signal<any[]>([]);
    keyword = '';
    currentUserInitial = '';

    ngOnInit() {
        this.labelService.loadLabels(this.boardId);
        this.boardService.getWorkspaceMembers(this.workspaceId).subscribe(members => {
            this.workspaceMembers.set(members);
        });
        const user = this.authService.currentUser();
        this.currentUserInitial = user?.name?.charAt(0)?.toUpperCase() || '?';
    }

    toggleFilter(filterId: string) {
        if (this.activeFilters.has(filterId)) {
            this.activeFilters.delete(filterId);
        } else {
            this.activeFilters.add(filterId);
        }
        this.filterChanged.emit();
    }

    toggleLabel(labelId: string) {
        if (this.selectedLabelIds.has(labelId)) {
            this.selectedLabelIds.delete(labelId);
        } else {
            this.selectedLabelIds.add(labelId);
        }
        this.filterChanged.emit();
    }

    toggleMember(userId: string) {
        if (this.selectedMemberIds.has(userId)) {
            this.selectedMemberIds.delete(userId);
        } else {
            this.selectedMemberIds.add(userId);
        }
        this.filterChanged.emit();
    }

    toggleCollapse() {
        this.collapseEmpty = !this.collapseEmpty;
        this.collapseChanged.emit(this.collapseEmpty);
    }

    onKeywordChange() {
        this.keywordChanged.emit(this.keyword);
    }

    clearAll() {
        this.selectedLabelIds.clear();
        this.selectedMemberIds.clear();
        this.activeFilters.clear();
        this.keyword = '';
        this.collapseEmpty = false;
        this.keywordChanged.emit('');
        this.collapseChanged.emit(false);
        this.filterChanged.emit();
    }
}
