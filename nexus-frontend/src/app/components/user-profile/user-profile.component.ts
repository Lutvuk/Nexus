import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User, UserPreferences, ActivityItem, DueReminderRunResponse } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { PreferencesService } from '../../services/preferences.service';

type TabType = 'profile' | 'activity' | 'settings' | 'accessibility';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-profile.component.html'
})
export class UserProfileComponent {
    @Output() close = new EventEmitter<void>();

    userService = inject(UserService);
    authService = inject(AuthService);
    toast = inject(ToastService);
    preferencesService = inject(PreferencesService);

    user = signal<User | null>(null);
    preferences = signal<UserPreferences | null>(null);
    activities = signal<ActivityItem[]>([]);
    activityTotal = signal(0);
    activityPage = signal(1);

    activeTab = signal<TabType>('profile');
    isLoading = signal(false);
    isSaving = signal(false);
    avatarPreview = signal<string | null>(null);
    isRunningDueReminders = signal(false);
    dueReminderResult = signal<DueReminderRunResponse | null>(null);

    // Profile form fields
    name = '';
    username = '';
    bio = '';
    avatarUrl = '';
    language = 'en';

    // File upload
    selectedFile: File | null = null;

    constructor() {
        this.loadProfile();
        this.loadPreferences();
    }

    loadProfile() {
        this.isLoading.set(true);
        this.userService.getMe().subscribe({
            next: (u) => {
                this.user.set(u);
                this.name = u.name || '';
                this.username = u.username || '';
                this.bio = u.bio || '';
                this.avatarUrl = u.avatar_url || '';
                this.language = u.language || 'en';
                this.isLoading.set(false);
            },
            error: () => {
                this.toast.show('Failed to load profile', 'error');
                this.isLoading.set(false);
            }
        });
    }

    loadPreferences() {
        this.userService.getPreferences().subscribe({
            next: (p) => {
                this.preferences.set(p);
                this.preferencesService.updatePreferences(p);
            },
            error: () => { } // silently fail, defaults will be created
        });
    }

    loadActivity() {
        this.userService.getUserActivity(this.activityPage()).subscribe({
            next: (res) => {
                this.activities.set(res.activities || []);
                this.activityTotal.set(res.total);
            },
            error: () => this.toast.show('Failed to load activity', 'error')
        });
    }

    switchTab(tab: TabType) {
        this.activeTab.set(tab);
        if (tab === 'activity' && this.activities().length === 0) {
            this.loadActivity();
        }
    }

    loadMoreActivity() {
        this.activityPage.update(p => p + 1);
        this.userService.getUserActivity(this.activityPage()).subscribe({
            next: (res) => {
                this.activities.update(existing => [...existing, ...(res.activities || [])]);
            },
            error: () => { }
        });
    }

    onAvatarSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.selectedFile = input.files[0];
            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                this.avatarPreview.set(e.target?.result as string);
            };
            reader.readAsDataURL(this.selectedFile);
        }
    }

    saveProfile() {
        if (!this.name.trim()) return;
        this.isSaving.set(true);

        // If there's a file to upload, do that first
        if (this.selectedFile) {
            this.userService.uploadAvatar(this.selectedFile).subscribe({
                next: (res) => {
                    this.avatarUrl = res.avatar_url;
                    this.selectedFile = null;
                    this.avatarPreview.set(null);
                    this.updateProfileData();
                },
                error: () => {
                    this.toast.show('Failed to upload avatar', 'error');
                    this.isSaving.set(false);
                }
            });
        } else {
            this.updateProfileData();
        }
    }

    private updateProfileData() {
        this.userService.updateProfile({
            name: this.name,
            username: this.username,
            bio: this.bio,
            avatar_url: this.avatarUrl,
            language: this.language
        }).subscribe({
            next: (updatedUser) => {
                this.toast.show('Profile updated', 'success');
                // Sync global auth state
                const u = updatedUser || {
                    ...this.user()!,
                    name: this.name,
                    username: this.username,
                    bio: this.bio,
                    avatar_url: this.avatarUrl,
                    language: this.language
                };
                this.user.set(u);
                this.authService.currentUser.set(u as any);
                localStorage.setItem('nexus_user', JSON.stringify(u));
                this.isSaving.set(false);
            },
            error: (err) => {
                const msg = err.error?.error || 'Failed to update profile';
                this.toast.show(msg, 'error');
                this.isSaving.set(false);
            }
        });
    }

    savePreferences() {
        const prefs = this.preferences();
        if (!prefs) return;
        this.isSaving.set(true);

        if (prefs.allow_desktop_notifications && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        this.userService.updatePreferences(prefs).subscribe({
            next: (updated) => {
                this.preferences.set(updated);
                this.preferencesService.updatePreferences(updated);
                this.toast.show('Preferences saved', 'success');
                this.isSaving.set(false);
            },
            error: () => {
                this.toast.show('Failed to save preferences', 'error');
                this.isSaving.set(false);
            }
        });
    }

    togglePref(key: keyof UserPreferences) {
        const prefs = this.preferences();
        if (!prefs) return;
        (prefs as any)[key] = !(prefs as any)[key];
        this.preferences.set({ ...prefs });
    }

    getTimeAgo(dateStr: string): string {
        const date = new Date(dateStr);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    getActivityLabel(activity: ActivityItem): string {
        const actorName = activity.user?.name || 'You';
        const action = (activity.action || 'updated').replace(/_/g, ' ');
        const target = activity.metadata?.['title'] || activity.metadata?.['card_title'] || activity.metadata?.['name'] || '';
        return target ? `${actorName} ${action}: ${target}` : `${actorName} ${action}`;
    }

    getActivityContext(activity: ActivityItem): string {
        const workspace = activity.workspace_name ? `Workspace: ${activity.workspace_name}` : '';
        const board = activity.board_title ? `Board: ${activity.board_title}` : '';
        if (workspace && board) return `${workspace} • ${board}`;
        return workspace || board || '';
    }

    runDueRemindersNow() {
        this.isRunningDueReminders.set(true);
        this.dueReminderResult.set(null);

        this.userService.runDueRemindersNow().subscribe({
            next: (res) => {
                this.dueReminderResult.set(res);
                this.toast.show('Due reminders run completed', 'success');
                this.isRunningDueReminders.set(false);
            },
            error: (err) => {
                const msg = err?.status === 403
                    ? 'You are not allowed to run reminders. Set ADMIN_USER_EMAILS on backend.'
                    : (err?.error?.error || 'Failed to run due reminders');
                this.toast.show(msg, 'error');
                this.isRunningDueReminders.set(false);
            }
        });
    }
}
