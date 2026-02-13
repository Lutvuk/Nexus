import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BoardService } from '../../services/board.service';
import { AuthService } from '../../services/auth.service';
import { DialogService } from '../../services/dialog.service';
import { ToastService } from '../../services/toast.service';
import { ShareModalComponent } from '../share-modal/share-modal.component';
import { NexusSkeletonComponent } from '../nexus-skeleton/nexus-skeleton.component';
import { FormsModule } from '@angular/forms';
import { TemplateGalleryComponent } from '../template-gallery/template-gallery.component';
import { OnboardingGuideComponent } from '../onboarding-guide/onboarding-guide.component';
import { BoardTemplate } from '../../models/board.model';
import { toBackendUrl } from '../../core/runtime-config';

const BOARD_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
];

@Component({
  selector: 'app-nexus-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ShareModalComponent, NexusSkeletonComponent, FormsModule, TemplateGalleryComponent, OnboardingGuideComponent],
  template: `
    <div class="min-h-screen bg-[#0F172A] pt-14 relative overflow-hidden">
      <!-- Background Blobs -->
      <div class="absolute top-0 left-0 w-[800px] h-[800px] bg-violet-600/8 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div class="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-600/8 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

      <div class="flex max-w-[1440px] mx-auto relative z-10">

        <!-- ===== LEFT SIDEBAR ===== -->
        <aside class="hidden lg:block w-64 shrink-0 px-4 py-6 border-r border-white/5 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto custom-scrollbar">
          <!-- Workspace -->
          <div class="mb-6">
            <div class="flex items-center gap-3 px-3 py-2 mb-4">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                @if (authService.currentUser()?.avatar_url) {
                <img [src]="resolveAvatarUrl(authService.currentUser()?.avatar_url)" class="w-full h-full object-cover rounded-lg"
                  alt="User Avatar">
                } @else {
                {{ authService.currentUser()?.name?.charAt(0)?.toUpperCase() }}
                }
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-white truncate">{{ selectedWorkspaceName() }}</p>
              </div>
            </div>
            <div class="px-2 space-y-1.5">
              @for (ws of displayedWorkspaces(); track ws.id) {
                <div class="flex items-center gap-1">
                  <button (click)="onWorkspaceChange(ws.id)"
                    class="nexus-sidebar-item flex-1 text-xs justify-start"
                    [ngClass]="selectedWorkspaceId() === ws.id ? 'active' : ''">
                    <span class="truncate">{{ ws.name }}</span>
                  </button>
                  @if (isWorkspaceOwner(ws)) {
                    <button (click)="renameWorkspace(ws)" class="h-7 w-7 rounded-md text-white/50 hover:text-white hover:bg-white/10 text-xs">✎</button>
                    <button (click)="deleteWorkspace(ws)" class="h-7 w-7 rounded-md text-red-300/70 hover:text-red-300 hover:bg-red-500/10 text-xs">🗑</button>
                  }
                </div>
              }
              <button (click)="createWorkspace()" class="nexus-sidebar-item w-full text-xs" [disabled]="!canCreateWorkspace()">
                + Create Workspace
              </button>
              @if (!canCreateWorkspace()) {
                <p class="px-2 text-[10px] text-amber-300/70">Maximum 10 workspaces per user reached.</p>
              }
            </div>
          </div>

          <!-- Nav Links -->
          <nav class="space-y-1 mb-6">
            <a routerLink="/dashboard" class="nexus-sidebar-item active">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3"/><rect width="7" height="5" x="14" y="3"/><rect width="7" height="9" x="14" y="12"/><rect width="7" height="5" x="3" y="16"/></svg>
              Boards
            </a>
            <button (click)="createBoard()" class="nexus-sidebar-item w-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
              Templates
            </button>
            <button (click)="openShareModal()" class="nexus-sidebar-item w-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Members
            </button>
          </nav>

          <!-- Sidebar Starred List -->
          @if (starredBoardsList().length > 0) {
            <div class="mb-6">
              <h4 class="nexus-section-header px-3 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Starred
              </h4>
              @for (board of starredBoardsList(); track board.id) {
                <a [routerLink]="['/board', board.id]" class="nexus-sidebar-item text-xs">
                  <div class="w-5 h-4 rounded" [style.background]="getBoardGradient(board)"></div>
                  <span class="truncate">{{ board.title }}</span>
                </a>
              }
            </div>
          }
        </aside>

        <!-- ===== MAIN CONTENT ===== -->
        <main class="flex-1 p-6 lg:p-8 min-w-0">
          <!-- Header -->
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 class="text-2xl font-bold text-white tracking-tight">Your Boards</h1>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <div class="relative group">
                <input
                  type="text"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  placeholder="Search boards..."
                  class="w-full md:w-56 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all pl-9">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
              </div>
            </div>
          </div>

          <!-- Pending Invitations -->
          @if (pendingInvitations().length > 0) {
            <div class="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-fade-in-up">
              <h3 class="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
                Pending Invitations
              </h3>
              <div class="space-y-2">
                @for (inv of pendingInvitations(); track inv.workspace_id) {
                  <div class="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span class="text-sm text-white">{{ inv.workspace?.name || 'Workspace' }}</span>
                    <div class="flex gap-2">
                      <button (click)="acceptInvitation(inv.workspace_id)" class="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-white text-xs font-medium">Accept</button>
                      <button (click)="declineInvitation(inv.workspace_id)" class="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-medium">Decline</button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Analytics Row -->
          <div class="grid grid-cols-3 gap-4 mb-8">
            <div class="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <p class="text-xs text-white/40 font-medium mb-1">Total Boards</p>
              <p class="text-2xl font-bold text-white">{{ totalBoards() }}</p>
            </div>
            <div class="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <p class="text-xs text-amber-400/80 font-medium mb-1">Starred</p>
              <p class="text-2xl font-bold text-amber-400">{{ starredBoards() }}</p>
            </div>
            <div class="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <p class="text-xs text-violet-400/80 font-medium mb-1">Active This Week</p>
              <p class="text-2xl font-bold text-violet-400">{{ recentBoardsCount() }}</p>
            </div>
          </div>

          @if (isLoading()) {
            <app-nexus-skeleton type="board" />
          } @else {

            <!-- ★ STARRED BOARDS SECTION -->
            @if (starredBoardsList().length > 0) {
              <div class="mb-8">
                <h2 class="nexus-section-header mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  Starred Boards
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  @for (board of starredBoardsList(); track board.id; let i = $index) {
                    <a [routerLink]="['/board', board.id]"
                      class="nexus-board-tile group animate-fade-in-up"
                      [style.background]="getBoardGradient(board)"
                      [style.animation-delay]="i * 50 + 'ms'">
                      <div class="tile-overlay"></div>
                      <div class="absolute inset-0 p-4 flex flex-col justify-end z-10">
                        <h3 class="text-sm font-bold text-white drop-shadow-md">{{ board.title }}</h3>
                      </div>
                      <!-- Star icon (always visible) -->
                      <button (click)="toggleStar($event, board)"
                        class="absolute top-2 right-2 z-20 text-amber-400/80 hover:text-amber-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      </button>
                    </a>
                  }
                </div>
              </div>
            }

            <!-- 🕐 RECENT BOARDS SECTION -->
            @if (recentBoardsList().length > 0) {
              <div class="mb-8">
                <h2 class="nexus-section-header mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Recently Viewed
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  @for (board of recentBoardsList(); track board.id; let i = $index) {
                    <a [routerLink]="['/board', board.id]"
                      class="nexus-board-tile group animate-fade-in-up"
                      [style.background]="getBoardGradient(board)"
                      [style.animation-delay]="i * 50 + 'ms'">
                      <div class="tile-overlay"></div>
                      <div class="absolute inset-0 p-4 flex flex-col justify-end z-10">
                        <h3 class="text-sm font-bold text-white drop-shadow-md">{{ board.title }}</h3>
                      </div>
                      <button (click)="toggleStar($event, board)"
                        class="absolute top-2 right-2 z-20 transition-colors"
                        [class]="board.is_starred ? 'text-amber-400' : 'text-white/30 opacity-0 group-hover:opacity-100'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" [attr.fill]="board.is_starred ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      </button>
                    </a>
                  }
                </div>
              </div>
            }

            <!-- ALL BOARDS SECTION -->
            <div class="mb-8">
              <h2 class="nexus-section-header mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3"/><rect width="7" height="5" x="14" y="3"/><rect width="7" height="9" x="14" y="12"/><rect width="7" height="5" x="3" y="16"/></svg>
                Your Boards
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                @for (board of filteredBoards(); track board.id; let i = $index) {
                  <div class="group relative animate-fade-in-up" [style.animation-delay]="i * 40 + 'ms'">
                    <a [routerLink]="['/board', board.id]"
                      class="nexus-board-tile block"
                      [style.background]="getBoardGradient(board)">
                      <div class="tile-overlay"></div>
                      <div class="absolute inset-0 p-4 flex flex-col justify-between z-10">
                        <div class="flex justify-between items-start">
                          <h3 class="text-sm font-bold text-white drop-shadow-md flex-1 mr-6">{{ board.title }}</h3>
                        </div>
                        <div class="flex items-center justify-between">
                          <span class="text-xs text-white/60">{{ board.updated_at | date:'MMM d' }}</span>
                        </div>
                      </div>
                    </a>
                    <!-- Floating action buttons -->
                    <div class="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button (click)="toggleStar($event, board)"
                        [class]="board.is_starred ? 'text-amber-400 opacity-100' : 'text-white/60 hover:text-amber-400'"
                        class="p-1 rounded transition-colors" [class.opacity-100]="board.is_starred">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" [attr.fill]="board.is_starred ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      </button>
                      <button (click)="deleteBoard($event, board.id)"
                        class="p-1 rounded text-white/40 hover:text-red-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="col-span-full py-16 text-center border border-dashed border-white/10 rounded-xl">
                    <div class="text-5xl mb-3">📋</div>
                    <h3 class="text-lg font-semibold text-white mb-1">No boards yet</h3>
                    <p class="text-sm text-white/40 mb-4">Create your first board to get started</p>
                    <button (click)="createBoard()"
                      class="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">
                      + Create Board
                    </button>
                  </div>
                }

                <!-- Create new board tile -->
                @if (filteredBoards().length > 0) {
                  <button (click)="createBoard()"
                    class="nexus-board-tile flex items-center justify-center bg-white/[0.04] border border-dashed border-white/10 hover:border-violet-500/30 hover:bg-white/[0.06]">
                    <div class="text-center">
                      <div class="text-2xl text-white/20 group-hover:text-violet-400 mb-1">+</div>
                      <span class="text-xs text-white/30">Create new board</span>
                    </div>
                  </button>
                }
              </div>
            </div>
          }
        </main>
      </div>

      @if (shareModalWorkspaceId()) {
        <app-share-modal [workspaceId]="shareModalWorkspaceId()!" (closed)="shareModalWorkspaceId.set(null); loadBoards()" />
      }

      @if (showTemplateGallery()) {
        <app-template-gallery (close)="showTemplateGallery.set(false)" (selected)="onTemplateSelected($event)" />
      }

      @if (showOnboarding()) {
        <app-onboarding-guide (completed)="showOnboarding.set(false)" />
      }
    </div>
  `
})
export class NexusDashboardComponent {
  authService = inject(AuthService);
  boardService = inject(BoardService);
  dialogService = inject(DialogService);
  router = inject(Router);
  private toast = inject(ToastService);

  boards = signal<any[]>([]);
  workspaces = signal<any[]>([]);
  selectedWorkspaceId = signal<string>('');
  pendingInvitations = signal<any[]>([]);
  shareModalWorkspaceId = signal<string | null>(null);
  showTemplateGallery = signal(false);
  showOnboarding = signal(false);
  isCreating = false;
  isLoading = signal(true);

  searchQuery = signal('');
  visibleBoards = computed(() => {
    const workspaceId = this.selectedWorkspaceId();
    const list = this.boards();
    if (!workspaceId) return list;
    return list.filter(board => board.workspace_id === workspaceId);
  });
  displayedWorkspaces = computed(() => this.workspaces().slice(0, 10));
  canCreateWorkspace = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;
    return this.workspaces().filter((w: any) => w.owner_id === currentUserId).length < 10;
  });
  filteredBoards = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.visibleBoards();
    return this.visibleBoards().filter(board =>
      board.title.toLowerCase().includes(query)
    );
  });

  // Analytics Computed Signals
  totalBoards = computed(() => this.visibleBoards().length);
  starredBoards = computed(() => this.visibleBoards().filter(b => b.is_starred).length);
  recentBoardsCount = computed(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.visibleBoards().filter(b => new Date(b.updated_at) > weekAgo).length;
  });

  // Starred and Recent board lists
  starredBoardsList = computed(() => this.visibleBoards().filter(b => b.is_starred));
  recentBoardsList = computed(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.visibleBoards()
      .filter(b => new Date(b.updated_at) > weekAgo && !b.is_starred)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4);
  });
  selectedWorkspaceName = computed(() => {
    const id = this.selectedWorkspaceId();
    if (!id) return `${this.authService.currentUser()?.name || 'My'} Workspace`;
    return this.workspaces().find((w: any) => w.id === id)?.name || 'Workspace';
  });

  // Board gradient based on board index
  getBoardGradient(board: any): string {
    const hash = board.id ? board.id.charCodeAt(0) + board.id.charCodeAt(1) : 0;
    return BOARD_GRADIENTS[hash % BOARD_GRADIENTS.length];
  }

  openShareModal() {
    const workspaceId = this.selectedWorkspaceId() || this.workspaces()[0]?.id;
    if (workspaceId) {
      this.shareModalWorkspaceId.set(workspaceId);
    } else {
      this.toast.show('No workspace found', 'error');
    }
  }

  constructor() {
    this.loadWorkspaces();
    this.loadBoards();
    this.loadInvitations();
    const user = this.authService.currentUser();
    if (user && !user.has_completed_onboarding) {
      this.showOnboarding.set(true);
    }
  }

  loadWorkspaces() {
    this.boardService.getWorkspaces().subscribe({
      next: (data) => {
        const list = data || [];
        this.workspaces.set(list);

        if (list.length === 0) {
          this.selectedWorkspaceId.set('');
          localStorage.removeItem('nexus_active_workspace_id');
          return;
        }

        const stored = localStorage.getItem('nexus_active_workspace_id');
        const matched = stored ? list.find((w: any) => w.id === stored) : null;
        const chosen = matched || list[0];
        this.selectedWorkspaceId.set(chosen.id);
        localStorage.setItem('nexus_active_workspace_id', chosen.id);
      },
      error: () => {
        this.workspaces.set([]);
        this.selectedWorkspaceId.set('');
      }
    });
  }

  onWorkspaceChange(workspaceId: string) {
    this.selectedWorkspaceId.set(workspaceId || '');
    if (workspaceId) {
      localStorage.setItem('nexus_active_workspace_id', workspaceId);
    } else {
      localStorage.removeItem('nexus_active_workspace_id');
    }
  }

  async createWorkspace() {
    const name = await this.dialogService.openPrompt({
      title: 'Create Workspace',
      promptLabel: 'Workspace Name',
      promptValue: '',
      confirmLabel: 'Create Workspace',
      type: 'prompt'
    });

    if (!name?.trim()) return;
    if (!this.canCreateWorkspace()) return;

    this.boardService.createWorkspace(name.trim()).subscribe({
      next: (workspace) => {
        const next = [workspace, ...this.workspaces()];
        this.workspaces.set(next);
        this.onWorkspaceChange(workspace.id);
        this.loadBoards();
      }
    });
  }

  isWorkspaceOwner(workspace: any): boolean {
    return workspace?.owner_id === this.authService.currentUser()?.id;
  }

  async renameWorkspace(workspace: any) {
    const name = await this.dialogService.openPrompt({
      title: 'Rename Workspace',
      promptLabel: 'Workspace Name',
      promptValue: workspace?.name || '',
      confirmLabel: 'Save',
      type: 'prompt'
    });
    if (!name?.trim() || name.trim() === workspace?.name) return;

    this.boardService.updateWorkspace(workspace.id, name.trim()).subscribe({
      next: () => {
        this.workspaces.update(list => list.map(w => w.id === workspace.id ? { ...w, name: name.trim() } : w));
      }
    });
  }

  async deleteWorkspace(workspace: any) {
    const confirmed = await this.dialogService.openConfirm({
      title: 'Delete Workspace?',
      message: `Workspace "${workspace?.name || 'Workspace'}" and its boards will be deleted.`,
      confirmLabel: 'Delete',
      isDanger: true,
      type: 'confirm'
    });
    if (!confirmed) return;

    this.boardService.deleteWorkspace(workspace.id).subscribe({
      next: () => {
        const remaining = this.workspaces().filter(w => w.id !== workspace.id);
        this.workspaces.set(remaining);
        const nextId = remaining[0]?.id || '';
        this.onWorkspaceChange(nextId);
        this.loadBoards();
      }
    });
  }

  loadInvitations() {
    this.boardService.getPendingInvitations().subscribe({
      next: (data) => this.pendingInvitations.set(data),
      error: () => this.pendingInvitations.set([])
    });
  }

  acceptInvitation(workspaceId: string) {
    this.boardService.acceptInvitation(workspaceId).subscribe({
      next: () => {
        this.loadInvitations();
        this.loadBoards();
      }
    });
  }

  declineInvitation(workspaceId: string) {
    this.boardService.declineInvitation(workspaceId).subscribe({
      next: () => this.loadInvitations()
    });
  }

  loadBoards() {
    this.isLoading.set(true);
    this.boardService.getBoards().subscribe({
      next: (data) => {
        this.boards.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.boards.set([]);
        this.isLoading.set(false);
      }
    });
  }

  async inviteUser() {
    const email = await this.dialogService.openPrompt({
      title: 'Invite to Workspace',
      promptLabel: 'User Email',
      promptValue: '',
      confirmLabel: 'Send Invitation',
      type: 'prompt'
    });

    if (email) {
      this.boardService.getWorkspaces().subscribe(workspaces => {
        if (workspaces && workspaces.length > 0) {
          const workspaceId = workspaces[0].id;
          this.boardService.inviteUser(workspaceId, email).subscribe();
        } else {
          this.toast.show('No workspace found to invite users to', 'error');
        }
      });
    }
  }

  createBoard() {
    this.showTemplateGallery.set(true);
  }

  async onTemplateSelected(template: BoardTemplate | null) {
    this.showTemplateGallery.set(false);

    const title = await this.dialogService.openPrompt({
      title: template ? `Create Board from ${template.name}` : 'Create New Board',
      promptLabel: 'Board Name',
      promptValue: template ? template.name : '',
      confirmLabel: 'Create Board',
      type: 'prompt'
    });

    if (title) {
      this.isCreating = true;
      const workspaceId = this.selectedWorkspaceId() || undefined;
      this.boardService.createBoard(title, workspaceId, template?.id).subscribe({
        next: (newBoard) => {
          this.isCreating = false;
          this.router.navigate(['/board', newBoard.id]);
        },
        error: (err) => {
          this.isCreating = false;
          this.toast.show('Error: ' + (err?.message || 'Failed to create board'), 'error');
        }
      });
    }
  }

  async deleteBoard(event: Event, boardId: string) {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = await this.dialogService.openConfirm({
      title: 'Delete Board',
      message: 'Are you sure you want to delete this board? This action cannot be undone.',
      confirmLabel: 'Delete',
      isDanger: true,
      type: 'confirm'
    });

    if (confirmed) {
      this.boardService.deleteBoard(boardId).subscribe({
        next: () => {
          this.boards.update(boards => boards.filter(b => b.id !== boardId));
        }
      });
    }
  }

  toggleStar(event: Event, board: any) {
    event.preventDefault();
    event.stopPropagation();

    this.boardService.toggleBoardStar(board.id).subscribe({
      next: (updatedBoard) => {
        board.is_starred = updatedBoard.is_starred;
      }
    });
  }

  resolveAvatarUrl(url?: string): string {
    return toBackendUrl(url);
  }
}
