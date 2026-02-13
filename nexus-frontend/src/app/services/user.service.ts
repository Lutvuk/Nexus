import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL, BACKEND_BASE_URL, toBackendUrl } from '../core/runtime-config';

export interface User {
    id: string;
    name: string;
    email: string;
    email_verified?: boolean;
    username?: string;
    bio?: string;
    avatar_url?: string;
    language?: string;
    has_completed_onboarding?: boolean;
}

export interface UserPreferences {
    user_id: string;
    notify_comments: boolean;
    notify_due_dates: boolean;
    notify_removed_from_card: boolean;
    notify_attachments: boolean;
    notify_card_created: boolean;
    notify_card_moved: boolean;
    notify_card_archived: boolean;
    allow_desktop_notifications: boolean;
    color_blind_mode: boolean;
    disable_keyboard_shortcuts: boolean;
    enable_suggestions: boolean;
    marketing_emails: boolean;
    cookie_analytics: boolean;
}

export interface ActivityItem {
    id: string;
    action: string;
    target_id: string;
    board_id: string;
    metadata?: Record<string, any>;
    board_title?: string;
    workspace_id?: string;
    workspace_name?: string;
    created_at: string;
    user?: User;
}

export interface DueReminderRunResponse {
    message: string;
    started_at: string;
    duration_ms: number;
    stats: {
        cards_scanned: number;
        recipients_checked: number;
        notifications_sent: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private apiUrl = API_BASE_URL;
    private baseUrl = BACKEND_BASE_URL;

    private normalizeAvatarUrl(avatarUrl?: string): string | undefined {
        return toBackendUrl(avatarUrl);
    }

    searchUsers(query: string): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}/users?q=${query}`).pipe(
            map(users => users.map(user => ({ ...user, avatar_url: this.normalizeAvatarUrl(user.avatar_url) })))
        );
    }

    getMe(): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(
            map(user => ({ ...user, avatar_url: this.normalizeAvatarUrl(user.avatar_url) }))
        );
    }

    updateProfile(data: Partial<User>): Observable<User> {
        return this.http.patch<User>(`${this.apiUrl}/users/me`, data).pipe(
            map(user => ({ ...user, avatar_url: this.normalizeAvatarUrl(user.avatar_url) }))
        );
    }

    uploadAvatar(file: File): Observable<{ avatar_url: string }> {
        const formData = new FormData();
        formData.append('avatar', file);
        return this.http.post<{ avatar_url: string }>(`${this.apiUrl}/users/me/avatar`, formData).pipe(
            map(res => ({ ...res, avatar_url: this.normalizeAvatarUrl(res.avatar_url) || '' }))
        );
    }

    getPreferences(): Observable<UserPreferences> {
        return this.http.get<UserPreferences>(`${this.apiUrl}/users/me/preferences`);
    }

    updatePreferences(data: Partial<UserPreferences>): Observable<UserPreferences> {
        return this.http.put<UserPreferences>(`${this.apiUrl}/users/me/preferences`, data);
    }

    getUserActivity(page: number = 1, limit: number = 20): Observable<{ activities: ActivityItem[]; total: number; page: number }> {
        return this.http.get<any>(`${this.apiUrl}/users/me/activity?page=${page}&limit=${limit}`);
    }

    completeOnboarding(): Observable<any> {
        return this.http.patch(`${this.apiUrl}/users/me/onboarding`, {});
    }

    runDueRemindersNow(): Observable<DueReminderRunResponse> {
        return this.http.post<DueReminderRunResponse>(`${this.apiUrl}/admin/reminders/run`, {});
    }
}
