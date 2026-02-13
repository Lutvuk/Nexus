import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { NexusNotification } from '../../models/notification.model';

type InboxTab = 'all' | 'unread' | 'read';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#0F172A] pt-14 px-4 md:px-6 lg:px-8">
      <div class="max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-xl md:text-2xl font-bold text-white">Inbox</h1>
            <p class="text-xs text-white/50">Your notifications and recent updates</p>
          </div>
          <button (click)="markAllAsRead()"
            class="h-8 px-3 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 text-white/80 text-xs font-semibold">
            Mark all as read
          </button>
        </div>

        <div class="flex items-center gap-2 mb-4">
          <button (click)="tab.set('all')" [class]="tabClass('all')">All</button>
          <button (click)="tab.set('unread')" [class]="tabClass('unread')">Unread</button>
          <button (click)="tab.set('read')" [class]="tabClass('read')">Read</button>
        </div>

        <div class="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          @if (filtered().length === 0) {
            <div class="py-14 text-center text-white/45 text-sm">No notifications in this tab.</div>
          } @else {
            <div class="divide-y divide-white/6">
              @for (note of filtered(); track note.id) {
                <button (click)="open(note)"
                  class="w-full text-left p-3 md:p-4 hover:bg-white/[0.04] transition-colors"
                  [ngClass]="{ 'bg-violet-500/10': !note.is_read }">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {{ note.actor?.name?.charAt(0)?.toUpperCase() || 'N' }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-semibold text-white truncate">{{ note.title }}</p>
                        @if (!note.is_read) {
                          <span class="h-2 w-2 rounded-full bg-violet-500 shrink-0"></span>
                        }
                      </div>
                      <p class="text-xs text-white/65 mt-0.5">{{ note.message }}</p>
                      <p class="text-[11px] text-white/35 mt-1.5">{{ note.created_at | date:'MMM d, h:mm a' }}</p>
                    </div>
                  </div>
                </button>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class InboxComponent {
  private notificationsService = inject(NotificationService);
  private router = inject(Router);

  tab = signal<InboxTab>('all');
  notifications = this.notificationsService.notifications;

  filtered = computed(() => {
    const list = this.notifications();
    const currentTab = this.tab();
    if (currentTab === 'unread') return list.filter(n => !n.is_read);
    if (currentTab === 'read') return list.filter(n => n.is_read);
    return list;
  });

  constructor() {
    this.notificationsService.loadNotifications();
  }

  tabClass(tab: InboxTab): string {
    const active = this.tab() === tab;
    return active
      ? 'h-8 px-3 rounded-lg bg-violet-500/20 border border-violet-400/50 text-violet-300 text-xs font-semibold'
      : 'h-8 px-3 rounded-lg bg-white/6 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-semibold';
  }

  markAllAsRead() {
    this.notificationsService.markAllAsRead();
  }

  open(note: NexusNotification) {
    this.notificationsService.markAsRead(note.id);
    if (note.entity_type === 'CARD' && note.board_id) {
      this.router.navigate(['/board', note.board_id], { queryParams: { card: note.entity_id } });
      return;
    }
    if (note.entity_type === 'BOARD') {
      this.router.navigate(['/board', note.entity_id]);
      return;
    }
    this.router.navigate(['/dashboard']);
  }
}
