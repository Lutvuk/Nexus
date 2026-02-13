import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ActivityService } from '../../services/activity.service';
import { WebSocketService } from '../../services/websocket.service';
import { Activity } from '../../models/board.model';
import { toBackendUrl } from '../../core/runtime-config';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      @if (isLoading()) {
        <div class="text-center text-white/40 text-sm py-4">Loading activity...</div>
      } @else {
        @for (activity of activities(); track activity.id) {
          <div class="flex gap-3 text-sm group">
            <!-- Avatar -->
             <div class="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0 uppercase border border-white/10 overflow-hidden">
                @if (activity.user?.avatar_url) {
                  <img [src]="resolveAvatarUrl(activity.user?.avatar_url)" class="w-full h-full object-cover" alt="User Avatar" />
                } @else {
                  {{ activity.user?.name?.charAt(0) || '?' }}
                }
             </div>
             
             <div class="flex-1">
                <div class="text-white">
                    <span class="font-semibold">{{ activity.user?.name || 'Unknown' }}</span>
                    <span class="text-white/60 text-xs ml-1">{{ formatAction(activity) }}</span>
                </div>
                <!-- Metadata display if needed -->
                @if (activity.metadata) {
                    <!-- <div class="text-xs text-white/50 bg-white/5 p-1 rounded mt-1">{{ activity.metadata | json }}</div> -->
                }
                <div class="text-xs text-white/40 mt-1">
                    {{ activity.created_at | date:'MMM d, h:mm a' }}
                </div>
             </div>
          </div>
        }
        @if (activities().length === 0) {
            <div class="text-center text-white/30 text-sm py-4">No activity yet.</div>
        }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ActivityFeedComponent implements OnInit, OnDestroy {
  @Input() cardId?: string;
  @Input() boardId?: string;

  private activityService = inject(ActivityService);
  private wsService = inject(WebSocketService);
  private subscriptions = new Subscription();

  activities = signal<Activity[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.loadActivity();

    // Listen for events that might imply new activity
    const wsSub = this.wsService.onEvent('CARD_UPDATED').subscribe((data: any) => this.loadActivity());
    this.subscriptions.add(wsSub);

    const wsMoveSub = this.wsService.onEvent('CARD_MOVED').subscribe((data: any) => this.loadActivity());
    this.subscriptions.add(wsMoveSub);

    // If we're at board level, also listen for column moves
    const wsColSub = this.wsService.onEvent('COLUMN_MOVED').subscribe((data: any) => this.loadActivity());
    this.subscriptions.add(wsColSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadActivity() {
    if (!this.cardId && !this.boardId) return;

    this.isLoading.set(true);
    let obs;

    if (this.cardId) {
      obs = this.activityService.getCardActivity(this.cardId);
    } else if (this.boardId) {
      obs = this.activityService.getBoardActivity(this.boardId);
    }

    if (obs) {
      obs.subscribe({
        next: (data) => {
          this.activities.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  formatAction(activity: Activity): string {
    const action = activity.action;
    switch (action) {
      case 'card_created': return 'created a card';
      case 'card_moved': return 'moved a card';
      case 'card_updated': return 'updated a card';
      case 'card_deleted': return 'deleted a card';
      case 'card_archived': return 'archived a card';
      case 'card_restored': return 'restored a card';
      case 'checklist_created': return 'added a checklist';
      case 'checklist_item_created': return 'added a checklist item';
      case 'comment_created': return 'added a comment';
      case 'attachment_uploaded': return 'uploaded an attachment';
      case 'label_created': return 'added a label';
      default: return action.replace(/_/g, ' ');
    }
  }

  resolveAvatarUrl(url?: string): string {
    return toBackendUrl(url);
  }
}
