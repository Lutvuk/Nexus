import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BoardService } from '../../services/board.service';
import { WebSocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';
import { WorkspaceSettingsComponent } from '../workspace-settings/workspace-settings.component';
import { NotificationDropdownComponent } from '../notification-dropdown/notification-dropdown.component';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { HelpGuideModalComponent } from '../help-guide-modal/help-guide-modal.component';
import { OnboardingGuideComponent } from '../onboarding-guide/onboarding-guide.component';
import { PreferencesService } from '../../services/preferences.service';
import { toBackendUrl } from '../../core/runtime-config';

@Component({
  selector: 'app-nexus-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, WorkspaceSettingsComponent, NotificationDropdownComponent, HelpGuideModalComponent, OnboardingGuideComponent],
  templateUrl: './nexus-navbar.component.html',
  styleUrl: './nexus-navbar.component.scss'
})
export class NexusNavbarComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private boardService = inject(BoardService);
  private wsService = inject(WebSocketService);
  private toast = inject(ToastService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private preferencesService = inject(PreferencesService);

  currentUser = this.authService.currentUser;
  unreadCount = this.notificationService.unreadCount;

  showWorkspaceSettingsModal = signal(false);
  showNotificationDropdown = signal(false);
  showHelpGuide = signal(false);
  showOnboardingGuide = signal(false);
  currentWorkspace = signal<any>(null);

  pendingInvitationsCount = signal<number>(0);
  showUserMenu = signal(false);
  suggestionsEnabled = computed(() => this.preferencesService.preferences()?.enable_suggestions !== false);
  private wsSub?: Subscription;

  ngOnInit() {
    if (this.currentUser()) {
      // Initial fetch
      this.loadInvitations();

      // Connect to user notification WebSocket room
      this.wsService.connectUserNotifications();

      // Listen for real-time invitation events
      this.wsSub = this.wsService.onEvent<any>('INVITATION_RECEIVED').subscribe({
        next: (payload) => {
          console.log('[Navbar] Invitation received:', payload);
          // Increment count and show toast
          this.pendingInvitationsCount.update(count => count + 1);
          this.toast.show(`New invitation: ${payload.workspace_name}`, 'info');
        }
      });

      // Load initial notifications scoped to active workspace
      const activeWorkspaceId = localStorage.getItem('nexus_active_workspace_id');
      this.notificationService.setActiveWorkspace(activeWorkspaceId);
      this.notificationService.loadNotifications(activeWorkspaceId);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const insideNotification = !!target.closest('.js-notification-root');
    if (!insideNotification) {
      this.showNotificationDropdown.set(false);
    }
  }

  toggleNotificationDropdown(event: Event) {
    event.stopPropagation();
    const willOpen = !this.showNotificationDropdown();
    this.showNotificationDropdown.set(willOpen);
    if (willOpen) {
      const activeWorkspaceId = localStorage.getItem('nexus_active_workspace_id');
      this.notificationService.setActiveWorkspace(activeWorkspaceId);
      this.notificationService.loadNotifications(activeWorkspaceId);
    }
    this.showHelpGuide.set(false);
  }

  toggleHelpGuide(event: Event) {
    if (!this.suggestionsEnabled()) return;
    event.stopPropagation();
    this.showHelpGuide.update(v => !v);
    this.showNotificationDropdown.set(false);
  }

  loadInvitations() {
    this.boardService.getPendingInvitations().subscribe({
      next: (invitations) => this.pendingInvitationsCount.set(invitations.length),
      error: () => this.pendingInvitationsCount.set(0)
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.wsService.disconnect();
  }

  onMenuAction(action: string) {
    this.showUserMenu.set(false);
    if (action === 'settings') {
      this.openWorkspaceSettings();
    } else if (action === 'switch_account') {
      this.logout();
    } else if (action === 'create') {
      this.router.navigate(['/dashboard']);
    }
  }

  onWorkspaceSettingsSaved() {
    this.boardService.getWorkspaces().subscribe(ws => {
      if (ws && ws.length > 0) {
        const currentId = this.currentWorkspace()?.id || localStorage.getItem('nexus_active_workspace_id');
        const matched = currentId ? ws.find(w => w.id === currentId) : null;
        this.currentWorkspace.set(matched || ws[0]);
      }
    });
  }

  private openWorkspaceSettings() {
    this.boardService.getWorkspaces().subscribe(ws => {
      if (!ws || ws.length === 0) return;

      const fallbackWorkspace = ws[0];
      const activeWorkspaceId = localStorage.getItem('nexus_active_workspace_id');
      const fromStored = activeWorkspaceId ? ws.find(w => w.id === activeWorkspaceId) : null;
      const boardId = this.extractBoardId(this.router.url);

      if (!boardId) {
        this.currentWorkspace.set(fromStored || fallbackWorkspace);
        this.showWorkspaceSettingsModal.set(true);
        return;
      }

      this.boardService.getBoardById(boardId).subscribe({
        next: (data) => {
          const workspaceId = data?.board?.workspace_id;
          const matched = ws.find(w => w.id === workspaceId);
          this.currentWorkspace.set(matched || fromStored || fallbackWorkspace);
          this.showWorkspaceSettingsModal.set(true);
        },
        error: () => {
          this.currentWorkspace.set(fromStored || fallbackWorkspace);
          this.showWorkspaceSettingsModal.set(true);
        }
      });
    });
  }

  private extractBoardId(url: string): string | null {
    const match = url.match(/\/board\/([^/?#]+)/);
    return match?.[1] || null;
  }

  logout() {
    this.wsService.disconnect();
    this.authService.logout();
  }

  onHelpAction(action: 'dashboard' | 'profile' | 'settings' | 'tour') {
    this.showHelpGuide.set(false);
    if (action === 'dashboard') {
      this.router.navigate(['/dashboard']);
      return;
    }
    if (action === 'profile') {
      this.onMenuAction('settings');
      return;
    }
    if (action === 'settings') {
      this.onMenuAction('settings');
      return;
    }
    if (action === 'tour') {
      if (!this.suggestionsEnabled()) return;
      this.showOnboardingGuide.set(true);
    }
  }

  resolveAvatarUrl(url?: string): string {
    return toBackendUrl(url);
  }
}
