import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { DialogService } from '../../services/dialog.service';
import { UserService, UserPreferences, ActivityItem } from '../../services/user.service';
import { PreferencesService } from '../../services/preferences.service';
import { toBackendUrl } from '../../core/runtime-config';

@Component({
    selector: 'app-workspace-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './workspace-settings.component.html'
})
export class WorkspaceSettingsComponent {
    @Input() workspace: any;
    @Output() close = new EventEmitter<void>();
    @Output() saved = new EventEmitter<void>();

    boardService = inject(BoardService);
    toast = inject(ToastService);
    authService = inject(AuthService);
    dialogService = inject(DialogService);
    userService = inject(UserService);
    preferencesService = inject(PreferencesService);

    name = '';
    activeSection = signal<'profile' | 'activity' | 'account' | 'general' | 'members' | 'requests' | 'invite'>('profile');
    isSavingProfile = signal(false);
    isSavingGeneral = signal(false);
    isLoadingMembers = signal(false);
    isLoadingRequests = signal(false);
    isLoadingInvite = signal(false);
    isLoadingPreferences = signal(false);
    isLoadingActivity = signal(false);
    avatarUploading = signal(false);
    members = signal<any[]>([]);
    workspaces = signal<any[]>([]);
    joinRequests = signal<any[]>([]);
    inviteLink = signal<string>('');
    preferences = signal<UserPreferences | null>(null);
    activities = signal<ActivityItem[]>([]);
    activityTotal = signal(0);
    activityPage = signal(1);
    profileName = '';
    profileEmail = '';
    profileEmailVerified = true;
    profileUsername = '';
    profileBio = '';
    profileAvatarUrl = '';

    ngOnInit() {
        if (!this.workspace) return;
        this.name = this.workspace.name || '';
        localStorage.setItem('nexus_active_workspace_id', this.workspace.id);
        this.loadWorkspaces();
        this.loadPersonal();
        this.loadData();
    }

    loadWorkspaces() {
        this.boardService.getWorkspaces().subscribe({
            next: (data) => this.workspaces.set(data || [])
        });
    }

    onWorkspaceSelected(workspaceId: string) {
        const selected = this.workspaces().find(w => w.id === workspaceId);
        if (!selected) return;
        this.workspace = selected;
        this.name = selected.name || '';
        localStorage.setItem('nexus_active_workspace_id', selected.id);
        this.members.set([]);
        this.joinRequests.set([]);
        this.inviteLink.set('');
        this.loadData();
    }

    loadPersonal() {
        this.userService.getMe().subscribe({
            next: (user) => {
                this.profileName = user.name || '';
                this.profileEmail = user.email || '';
                this.profileEmailVerified = user.email_verified !== false;
                this.profileUsername = user.username || '';
                this.profileBio = user.bio || '';
                this.profileAvatarUrl = user.avatar_url || '';
            }
        });

        this.isLoadingPreferences.set(true);
        this.userService.getPreferences().subscribe({
            next: (prefs) => {
                this.preferences.set(prefs);
                this.isLoadingPreferences.set(false);
            },
            error: () => this.isLoadingPreferences.set(false)
        });

        this.loadActivity(true);
    }

    loadActivity(reset = false) {
        if (reset) {
            this.activityPage.set(1);
            this.activities.set([]);
        }
        this.isLoadingActivity.set(true);
        this.userService.getUserActivity(this.activityPage(), 20).subscribe({
            next: (res) => {
                this.activityTotal.set(res.total || 0);
                if (reset) {
                    this.activities.set(res.activities || []);
                } else {
                    this.activities.set([...(this.activities() || []), ...(res.activities || [])]);
                }
                this.isLoadingActivity.set(false);
            },
            error: () => this.isLoadingActivity.set(false)
        });
    }

    loadMoreActivity() {
        if (this.activities().length >= this.activityTotal()) return;
        this.activityPage.set(this.activityPage() + 1);
        this.loadActivity(false);
    }

    formatActivityTitle(item: ActivityItem): string {
        return (item.action || '').replace(/_/g, ' ');
    }

    formatActivityContext(item: ActivityItem): string {
        const board = item.board_title ? `Board: ${item.board_title}` : '';
        const workspace = item.workspace_name ? `Workspace: ${item.workspace_name}` : '';
        return [board, workspace].filter(Boolean).join(' • ');
    }

    save() {
        if (!this.name || !this.workspace) return;

        this.isSavingGeneral.set(true);
        this.boardService.updateWorkspace(this.workspace.id, this.name).subscribe({
            next: () => {
                this.workspace = { ...this.workspace, name: this.name };
                this.isSavingGeneral.set(false);
                this.saved.emit();
                this.toast.show('Workspace name updated', 'success');
            },
            error: () => {
                this.isSavingGeneral.set(false);
            }
        });
    }

    saveProfile() {
        this.isSavingProfile.set(true);
        this.userService.updateProfile({
            name: this.profileName,
            username: this.profileUsername || undefined,
            bio: this.profileBio || undefined,
            avatar_url: this.profileAvatarUrl || undefined
        }).subscribe({
            next: (user) => {
                const current = this.authService.currentUser();
                if (current) {
                    const merged = { ...current, ...user };
                    this.authService.currentUser.set(merged);
                    localStorage.setItem('nexus_user', JSON.stringify(merged));
                }
                this.isSavingProfile.set(false);
                this.toast.show('Profile updated', 'success');
            },
            error: () => this.isSavingProfile.set(false)
        });
    }

    onAvatarSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.avatarUploading.set(true);
        this.userService.uploadAvatar(file).subscribe({
            next: (res) => {
                this.profileAvatarUrl = res.avatar_url;
                const current = this.authService.currentUser();
                if (current) {
                    const updated = { ...current, avatar_url: res.avatar_url };
                    this.authService.currentUser.set(updated);
                    localStorage.setItem('nexus_user', JSON.stringify(updated));
                }
                this.avatarUploading.set(false);
                this.toast.show('Avatar updated', 'success');
            },
            error: () => this.avatarUploading.set(false)
        });
    }

    togglePreference(key: keyof UserPreferences) {
        const prefs = this.preferences();
        if (!prefs) return;
        const nextValue = !prefs[key];

        if (key === 'allow_desktop_notifications' && nextValue) {
            if (typeof window === 'undefined' || !('Notification' in window)) {
                this.toast.show('Desktop notifications are not supported in this browser', 'error');
                return;
            }
            if (Notification.permission === 'default') {
                Notification.requestPermission().then((permission) => {
                    if (permission !== 'granted') {
                        this.toast.show('Desktop notifications were blocked by browser permissions', 'error');
                        return;
                    }
                    this.applyPreferenceUpdate(key, true);
                });
                return;
            }
            if (Notification.permission !== 'granted') {
                this.toast.show('Please allow notifications in your browser settings first', 'error');
                return;
            }
        }

        this.applyPreferenceUpdate(key, nextValue);
    }

    private applyPreferenceUpdate(key: keyof UserPreferences, value: boolean) {
        const prefs = this.preferences();
        if (!prefs) return;
        const next = { ...prefs, [key]: value };
        this.preferences.set(next);
        this.preferencesService.updatePreferences(next);
        this.userService.updatePreferences({ [key]: value }).subscribe({
            next: () => this.toast.show('Preference updated', 'success')
        });
    }

    loadData() {
        this.loadMembers();
        this.loadJoinRequests();
        this.loadInviteLink();
    }

    loadMembers() {
        if (!this.workspace?.id) return;
        this.isLoadingMembers.set(true);
        this.boardService.getWorkspaceMembers(this.workspace.id).subscribe({
            next: (data) => {
                this.members.set(data || []);
                this.isLoadingMembers.set(false);
            },
            error: () => this.isLoadingMembers.set(false)
        });
    }

    loadJoinRequests() {
        if (!this.workspace?.id) return;
        this.isLoadingRequests.set(true);
        this.boardService.getJoinRequests(this.workspace.id).subscribe({
            next: (data) => {
                this.joinRequests.set(data || []);
                this.isLoadingRequests.set(false);
            },
            error: () => this.isLoadingRequests.set(false)
        });
    }

    loadInviteLink() {
        if (!this.workspace?.id) return;
        this.isLoadingInvite.set(true);
        this.boardService.getInviteLink(this.workspace.id).subscribe({
            next: (data: any) => {
                this.inviteLink.set(data?.link || '');
                this.isLoadingInvite.set(false);
            },
            error: () => this.isLoadingInvite.set(false)
        });
    }

    isOwner(): boolean {
        const currentUserId = this.authService.currentUser()?.id;
        return this.members().some(m => m.user_id === currentUserId && m.role === 'owner');
    }

    async removeMember(userId: string) {
        if (!this.workspace?.id) return;
        const confirmed = await this.dialogService.openConfirm({
            title: 'Remove Member?',
            message: 'This member will lose access to the workspace.',
            confirmLabel: 'Remove',
            isDanger: true,
            type: 'confirm'
        });
        if (!confirmed) return;
        this.boardService.removeMember(this.workspace.id, userId).subscribe({
            next: () => this.loadMembers()
        });
    }

    updateRole(userId: string, role: string) {
        if (!this.workspace?.id) return;
        this.boardService.updateMemberRole(this.workspace.id, userId, role).subscribe({
            next: () => this.loadMembers()
        });
    }

    approveRequest(userId: string) {
        if (!this.workspace?.id) return;
        this.boardService.approveJoinRequest(this.workspace.id, userId).subscribe({
            next: () => {
                this.loadJoinRequests();
                this.loadMembers();
            }
        });
    }

    declineRequest(userId: string) {
        if (!this.workspace?.id) return;
        this.boardService.declineJoinRequest(this.workspace.id, userId).subscribe({
            next: () => this.loadJoinRequests()
        });
    }

    createInviteLink() {
        if (!this.workspace?.id) return;
        this.boardService.createInviteLink(this.workspace.id).subscribe({
            next: (data: any) => this.inviteLink.set(data?.link || '')
        });
    }

    revokeInviteLink() {
        if (!this.workspace?.id) return;
        this.boardService.revokeInviteLink(this.workspace.id).subscribe({
            next: () => this.inviteLink.set('')
        });
    }

    async leaveWorkspace() {
        if (!this.workspace?.id || this.isOwner()) return;
        const confirmed = await this.dialogService.openConfirm({
            title: 'Leave Workspace?',
            message: 'You will need a new invite to rejoin.',
            confirmLabel: 'Leave',
            isDanger: true,
            type: 'confirm'
        });
        if (!confirmed) return;
        this.boardService.leaveWorkspace(this.workspace.id).subscribe({
            next: () => this.close.emit()
        });
    }

    copyLink() {
        const link = this.inviteLink();
        if (!link) return;
        navigator.clipboard.writeText(link);
        this.toast.show('Invite link copied', 'success');
    }

    resolveAvatarUrl(url?: string): string {
        return toBackendUrl(url);
    }

    resendVerification() {
        if (!this.profileEmail) return;
        this.authService.resendVerification(this.profileEmail).subscribe({
            next: (res) => this.toast.show(res?.message || 'Verification email sent', 'success')
        });
    }

    async verifyNow() {
        if (!this.profileEmail) return;
        const code = await this.dialogService.openPrompt({
            title: 'Verify Email',
            promptLabel: '6-digit verification code',
            promptValue: '',
            confirmLabel: 'Verify',
            type: 'prompt'
        });
        if (!code) return;

        this.authService.verifyEmail({ email: this.profileEmail, code: code.trim() }).subscribe({
            next: () => {
                this.profileEmailVerified = true;
                this.toast.show('Email verified', 'success');
                this.loadPersonal();
            },
            error: (err) => this.toast.show(err?.error?.error || 'Verification failed', 'error')
        });
    }
}
