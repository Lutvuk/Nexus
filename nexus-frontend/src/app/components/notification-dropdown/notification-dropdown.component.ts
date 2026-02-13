import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { NexusNotification } from '../../models/notification.model';

@Component({
    selector: 'app-notification-dropdown',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="w-80 max-h-[480px] nexus-panel-shell rounded-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <!-- Header -->
        <div class="nexus-panel-header flex items-center justify-between shrink-0">
            <h3 class="nexus-panel-title">Notifications</h3>
            <button (click)="markAllAsRead()" class="text-xs text-violet-300 hover:text-violet-200 font-semibold transition-colors">
                Mark all as read
            </button>
        </div>

        <!-- Notification List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
            @if (notifications().length === 0) {
                <div class="flex flex-col items-center justify-center p-12 text-center opacity-40">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-3">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                    </svg>
                    <p class="text-sm">No notifications yet</p>
                </div>
            } @else {
                <div class="divide-y divide-white/10">
                    @for (note of notifications(); track note.id) {
                        <div (click)="onSelect(note)" 
                             class="p-4 hover:bg-white/[0.05] cursor-pointer transition-colors relative group"
                             [ngClass]="{'bg-violet-500/[0.07]': !note.is_read}">
                            
                            @if (!note.is_read) {
                                <div class="absolute top-4 right-4 h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_#7c3aed]"></div>
                            }

                            <div class="flex gap-3">
                                <!-- Actor Avatar/Initial -->
                                <div class="h-8 w-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-lg">
                                    @if (note.actor?.avatar_url) {
                                    <img [src]="note.actor?.avatar_url" class="w-full h-full object-cover rounded-full"
                                        alt="Actor Avatar">
                                    } @else {
                                    {{ note.actor?.name?.charAt(0)?.toUpperCase() || '?' }}
                                    }
                                </div>

                                <div class="flex-1 min-w-0">
                                    <p class="text-[13px] text-white/90 font-semibold mb-0.5">{{ note.title }}</p>
                                    <p class="text-xs text-white/55 leading-relaxed">{{ note.message }}</p>
                                    <p class="text-[10px] text-white/30 mt-2 font-medium">{{ note.created_at | date:'shortTime' }} • {{ note.created_at | date:'MMM d' }}</p>
                                </div>
                            </div>

                            <!-- Mark as Read Button (on hover) -->
                            @if (!note.is_read) {
                                <button (click)="markAsRead($event, note.id)" 
                                        class="absolute bottom-4 right-4 text-[10px] text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-tighter">
                                    Mark read
                                </button>
                            }
                        </div>
                    }
                </div>
            }
        </div>
    </div>
    `,
    styles: [`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
    `]
})
export class NotificationDropdownComponent {
    notificationService = inject(NotificationService);
    router = inject(Router);
    @Output() navigate = new EventEmitter<void>();

    notifications = this.notificationService.notifications;

    markAsRead(event: Event, id: string) {
        event.stopPropagation();
        this.notificationService.markAsRead(id);
    }

    markAllAsRead() {
        this.notificationService.markAllAsRead();
    }

    onSelect(note: NexusNotification) {
        this.notificationService.markAsRead(note.id);
        this.navigate.emit();

        if (note.entity_type === 'CARD' && note.board_id) {
            this.router.navigate(['/board', note.board_id], { queryParams: { card: note.entity_id } });
        } else if (note.entity_type === 'BOARD') {
            this.router.navigate(['/board', note.entity_id]);
        }
    }

}
