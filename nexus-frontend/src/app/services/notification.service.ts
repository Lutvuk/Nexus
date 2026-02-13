import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NexusNotification } from '../models/notification.model';
import { WebSocketService } from './websocket.service';
import { PreferencesService } from './preferences.service';
import { HttpParams } from '@angular/common/http';
import { API_BASE_URL, toBackendUrl } from '../core/runtime-config';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private wsService = inject(WebSocketService);
    private preferencesService = inject(PreferencesService);
    private apiUrl = `${API_BASE_URL}/notifications`;

    // State
    private _notifications = signal<NexusNotification[]>([]);
    notifications = computed(() => this._notifications());
    unreadCount = computed(() => this._notifications().filter(n => !n.is_read).length);
    private activeWorkspaceId = signal<string | null>(null);

    constructor() {
        this.listenToWebSockets();
    }

    private listenToWebSockets() {
        this.wsService.onEvent('NOTIFICATION_RECEIVED').subscribe((notification: any) => {
            console.log('[NotificationService] Real-time note received:', notification);
            const normalized = this.normalizeNotification(notification);
            this.maybeShowDesktopNotification(normalized);
            this.loadNotifications(this.getEffectiveWorkspaceId());
        });
    }

    private maybeShowDesktopNotification(notification: NexusNotification) {
        const prefs = this.preferencesService.preferences();
        if (!prefs?.allow_desktop_notifications) return;
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        const title = notification.title || 'Nexus Notification';
        const options: NotificationOptions = {
            body: notification.message || '',
            tag: notification.id
        };
        new Notification(title, options);
    }

    setActiveWorkspace(workspaceId: string | null) {
        this.activeWorkspaceId.set(workspaceId);
    }

    private getEffectiveWorkspaceId(): string | null {
        return this.activeWorkspaceId() || localStorage.getItem('nexus_active_workspace_id');
    }

    loadNotifications(workspaceId?: string | null) {
        const resolvedWorkspaceId = workspaceId ?? this.getEffectiveWorkspaceId();
        let params = new HttpParams();
        if (resolvedWorkspaceId) {
            params = params.set('workspace_id', resolvedWorkspaceId);
        }

        this.http.get<NexusNotification[]>(this.apiUrl, { params }).subscribe(data => {
            this._notifications.set(data.map(note => this.normalizeNotification(note)));
        });
    }

    markAsRead(id: string) {
        // Optimistic update
        this._notifications.update(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );

        this.http.patch(`${this.apiUrl}/${id}/read`, {}).subscribe({
            error: () => {
                // Rollback if needed, but for simplicity we'll just log
                console.error('Failed to mark notification as read');
            }
        });
    }

    markAllAsRead() {
        // Optimistic update
        this._notifications.update(prev =>
            prev.map(n => ({ ...n, is_read: true }))
        );

        const workspaceId = this.getEffectiveWorkspaceId();
        let params = new HttpParams();
        if (workspaceId) {
            params = params.set('workspace_id', workspaceId);
        }

        this.http.post(`${this.apiUrl}/read-all`, {}, { params }).subscribe({
            error: () => {
                console.error('Failed to mark all notifications as read');
            }
        });
    }

    private normalizeNotification(notification: NexusNotification): NexusNotification {
        return {
            ...notification,
            actor: notification.actor ? {
                ...notification.actor,
                avatar_url: this.normalizeAvatarUrl(notification.actor.avatar_url)
            } : undefined
        };
    }

    private normalizeAvatarUrl(avatarUrl?: string): string | undefined {
        return toBackendUrl(avatarUrl);
    }
}
