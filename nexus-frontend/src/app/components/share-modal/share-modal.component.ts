import { Component, inject, signal, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { toBackendUrl } from '../../core/runtime-config';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" (click)="close()">
      <div class="bg-slate-800 rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-white/10">
          <h2 class="text-xl font-bold text-white">Share Workspace</h2>
          <button (click)="close()" class="text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <!-- Email Invite Section -->
        <div class="p-4 border-b border-white/10">
          <div class="flex gap-2">
            <input type="email" [(ngModel)]="inviteEmail" placeholder="Email address or name" 
              class="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500">
            <button (click)="sendInvite()" [disabled]="!inviteEmail" 
              class="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
              Share
            </button>
          </div>
        </div>

        <!-- Invite Link Section -->
        <div class="p-4 border-b border-white/10">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 text-white/70">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span class="text-sm">Share with a link</span>
            </div>
          </div>
          @if (inviteLink()) {
            <div class="flex gap-2">
              <input type="text" [value]="inviteLink()" readonly 
                class="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm font-mono">
              <button (click)="copyLink()" class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors">
                Copy
              </button>
              <button (click)="revokeLink()" class="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 font-medium rounded-lg transition-colors">
                Revoke
              </button>
            </div>
          } @else {
            <button (click)="createLink()" class="w-full py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white font-medium rounded-lg transition-colors">
              Create link
            </button>
          }
        </div>

        <!-- Print / Export Section -->
        <div class="p-4 border-b border-white/10">
          <div class="text-white/70 text-sm mb-2">Board print/export</div>
          <div class="grid grid-cols-2 gap-2">
            <button (click)="printBoardTemplate()" [disabled]="!boardId"
              class="py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white/80 hover:text-white font-medium rounded-lg transition-colors text-sm">
              Print board
            </button>
            <button (click)="printWorkspaceTemplate()"
              class="py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white/80 hover:text-white font-medium rounded-lg transition-colors text-sm">
              Print workspace
            </button>
            <button (click)="exportJson()" [disabled]="!boardId"
              class="py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white/80 hover:text-white font-medium rounded-lg transition-colors text-sm">
              JSON
            </button>
            <button (click)="exportCsv()" [disabled]="!boardId"
              class="py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white/80 hover:text-white font-medium rounded-lg transition-colors text-sm">
              CSV
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-white/10">
          <button (click)="activeTab.set('members')" 
            [class]="activeTab() === 'members' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-white/50'"
            class="flex-1 py-3 text-sm font-medium transition-colors hover:text-white">
            Members <span class="ml-1 px-2 py-0.5 rounded bg-white/10 text-xs">{{ members().length }}</span>
          </button>
          <button (click)="activeTab.set('requests')" 
            [class]="activeTab() === 'requests' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-white/50'"
            class="flex-1 py-3 text-sm font-medium transition-colors hover:text-white">
            Join requests <span class="ml-1 px-2 py-0.5 rounded bg-white/10 text-xs">{{ joinRequests().length }}</span>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 max-h-60">
          @if (activeTab() === 'members') {
            <div class="space-y-2">
              @for (member of members(); track member.user_id) {
                <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                      @if (member.user?.avatar_url) {
                      <img [src]="resolveAvatarUrl(member.user?.avatar_url)" class="w-full h-full object-cover rounded-full"
                        alt="Member Avatar">
                      } @else {
                      {{ member.user?.name?.charAt(0) || '?' }}
                      }
                    </div>
                    <div>
                      <div class="text-white font-medium">{{ member.user?.name }}</div>
                      <div class="text-white/50 text-sm">{{ member.user?.email }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    @if (isOwner() && member.role !== 'owner') {
                      <select [ngModel]="member.role" (ngModelChange)="updateRole(member.user_id, $event)" 
                        class="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70 focus:outline-none focus:border-violet-500">
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    } @else {
                      <span class="text-white/40 text-sm capitalize">{{ member.role }}</span>
                    }
                    
                    @if (member.role !== 'owner' && isOwner()) {
                      <button (click)="removeMember(member.user_id)" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    }
                  </div>
                </div>
              } @empty {
                <div class="text-center text-white/40 py-8">No members yet</div>
              }
            </div>
          } @else {
            <div class="space-y-2">
              @for (request of joinRequests(); track request.user_id) {
                <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                      @if (request.user?.avatar_url) {
                      <img [src]="resolveAvatarUrl(request.user?.avatar_url)" class="w-full h-full object-cover rounded-full"
                        alt="Request Avatar">
                      } @else {
                      {{ request.user?.name?.charAt(0) || '?' }}
                      }
                    </div>
                    <div>
                      <div class="text-white font-medium">{{ request.user?.name }}</div>
                      <div class="text-white/50 text-sm">{{ request.user?.email }}</div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button (click)="approveRequest(request.user_id)" class="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors">
                      Approve
                    </button>
                    <button (click)="declineRequest(request.user_id)" class="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-sm font-medium rounded-lg transition-colors">
                      Decline
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="text-center text-white/40 py-8">No pending requests</div>
              }
            </div>
          }
        </div>

        <!-- Leave Button (for non-owners) -->
        <div class="p-4 border-t border-white/10">
          <button (click)="leaveWorkspace()" class="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors">
            Leave Workspace
          </button>
        </div>
      </div>
    </div>
  `
})
export class ShareModalComponent implements OnInit, OnDestroy {
  @Input() workspaceId!: string;
  @Input() boardId?: string;
  @Input() boardTitle?: string;
  @Output() closed = new EventEmitter<void>();

  private boardService = inject(BoardService);

  inviteEmail = '';
  inviteLink = signal<string>('');
  members = signal<any[]>([]);
  joinRequests = signal<any[]>([]);
  activeTab = signal<'members' | 'requests'>('members');

  private authService = inject(AuthService);
  private wsService = inject(WebSocketService);
  private subscription?: Subscription;

  isOwner(): boolean {
    // Find if current user is the owner member
    const currentUserId = this.authService.currentUser()?.id;
    return this.members().some(m => m.user_id === currentUserId && m.role === 'owner');
  }

  ngOnInit() {
    this.loadData();
    // Subscribe to real-time role updates
    this.subscription = this.wsService.onEvent('ROLE_UPDATED').subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  loadData() {
    this.boardService.getWorkspaceMembers(this.workspaceId).subscribe({
      next: (data) => this.members.set(data)
    });
    this.boardService.getJoinRequests(this.workspaceId).subscribe({
      next: (data) => this.joinRequests.set(data)
    });
    this.boardService.getInviteLink(this.workspaceId).subscribe({
      next: (data: any) => {
        if (data?.link) this.inviteLink.set(data.link);
      }
    });
  }

  sendInvite() {
    if (!this.inviteEmail) return;
    this.boardService.inviteUser(this.workspaceId, this.inviteEmail).subscribe({
      next: () => {
        this.inviteEmail = '';
        this.loadData();
      }
    });
  }

  createLink() {
    this.boardService.createInviteLink(this.workspaceId).subscribe({
      next: (data) => this.inviteLink.set(data.link)
    });
  }

  copyLink() {
    navigator.clipboard.writeText(this.inviteLink());
  }

  revokeLink() {
    this.boardService.revokeInviteLink(this.workspaceId).subscribe({
      next: () => this.inviteLink.set('')
    });
  }

  removeMember(userId: string) {
    this.boardService.removeMember(this.workspaceId, userId).subscribe({
      next: () => this.loadData()
    });
  }

  approveRequest(userId: string) {
    this.boardService.approveJoinRequest(this.workspaceId, userId).subscribe({
      next: () => this.loadData()
    });
  }

  declineRequest(userId: string) {
    this.boardService.declineJoinRequest(this.workspaceId, userId).subscribe({
      next: () => this.loadData()
    });
  }

  updateRole(userId: string, newRole: string) {
    this.boardService.updateMemberRole(this.workspaceId, userId, newRole).subscribe({
      next: () => this.loadData()
    });
  }

  leaveWorkspace() {
    this.boardService.leaveWorkspace(this.workspaceId).subscribe({
      next: () => this.close()
    });
  }

  printBoardTemplate() {
    if (!this.boardId) return;
    this.boardService.getBoardById(this.boardId).pipe(
      timeout(10000),
      catchError(() => of(null))
    ).subscribe(data => {
      if (!data) return;
      const html = this.buildPrintHtml(data);
      const popup = window.open('', '_blank', 'width=1400,height=900');
      if (!popup) return;
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.onload = () => popup.print();
    });
  }

  printWorkspaceTemplate() {
    this.boardService.getBoards().pipe(
      timeout(10000),
      catchError(() => of([]))
    ).subscribe(boards => {
      const workspaceBoards = (boards || []).filter((b: any) => b.workspace_id === this.workspaceId);
      if (workspaceBoards.length === 0) return;

      const requests = workspaceBoards.map((b: any) =>
        this.boardService.getBoardById(b.id).pipe(
          timeout(10000),
          catchError(() => of(null))
        )
      );
      forkJoin(requests).subscribe(boardDetails => {
        const validBoards = (boardDetails || []).filter((b: any) => !!b);
        if (validBoards.length === 0) return;
        const html = this.buildWorkspacePrintHtml(validBoards);
        const popup = window.open('', '_blank', 'width=1500,height=950');
        if (!popup) return;
        popup.document.open();
        popup.document.write(html);
        popup.document.close();
        popup.onload = () => popup.print();
      });
    });
  }

  exportJson() {
    if (!this.boardId) return;
    this.boardService.getBoardById(this.boardId).pipe(
      timeout(10000),
      catchError(() => of(null))
    ).subscribe(data => {
      if (!data) return;
      const payload = {
        exported_at: new Date().toISOString(),
        board: {
          id: data.board?.id,
          title: data.board?.title,
          workspace_id: data.board?.workspace_id
        },
        columns: (data.columns || []).map((column: any) => ({
          id: column.id,
          name: column.name,
          position: column.position,
          cards: (column.cards || []).map((card: any) => ({
            id: card.id,
            title: card.title,
            description: card.description || '',
            due_date: card.due_date || null,
            members: (card.members || []).map((m: any) => ({ id: m.id, name: m.name, email: m.email })),
            labels: (card.labels || []).map((l: any) => ({ id: l.id, name: l.name, color: l.color })),
            checklist_count: (card.checklists || []).length,
            comment_count: (card.comments || []).length
          }))
        }))
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
      this.downloadBlob(blob, `${this.safeFileName(this.boardTitle || data.board?.title || 'board')}.json`);
    });
  }

  exportCsv() {
    if (!this.boardId) return;
    this.boardService.getBoardById(this.boardId).pipe(
      timeout(10000),
      catchError(() => of(null))
    ).subscribe(data => {
      if (!data) return;
      const rows: string[] = [];
      rows.push([
        'Card ID',
        'Card Name',
        'Card URL',
        'Card Description',
        'Labels',
        'Members',
        'Due Date',
        'Attachment Count',
        'Attachment Links',
        'Checklist Item Total Count',
        'Checklist Item Completed Count',
        'Vote Count',
        'Comment Count',
        'Last Activity Date',
        'List ID',
        'List Name',
        'Board ID',
        'Board Name',
        'Archived',
        'Start Date',
        'Due Complete',
        'Due Reminder'
      ].join(','));

      (data.columns || []).forEach((column: any) => {
        (column.cards || []).forEach((card: any) => {
          const labels = (card.labels || []).map((l: any) => l.name).join(', ');
          const members = (card.members || []).map((m: any) => m.name).join(', ');
          const attachments = (card.attachments || []).map((a: any) => {
            const filePath = a.file_path || '';
            if (!filePath) return '';
            return toBackendUrl(filePath);
          }).filter((v: string) => !!v).join(', ');
          const checklists = card.checklists || [];
          const checklistItems = checklists.flatMap((c: any) => c.items || []);
          const checklistTotal = checklistItems.length;
          const checklistDone = checklistItems.filter((i: any) => !!i.is_completed).length;
          const dueDate = card.due_date || '';
          const dueComplete = !!card.is_complete;

          rows.push([
            this.csvEscape(card.id || ''),
            this.csvEscape(card.title || ''),
            this.csvEscape(`${window.location.origin}/board/${data.board?.id || this.boardId || ''}?card=${card.id || ''}`),
            this.csvEscape(card.description || ''),
            this.csvEscape(labels),
            this.csvEscape(members),
            this.csvEscape(dueDate),
            this.csvEscape(String((card.attachments || []).length)),
            this.csvEscape(attachments),
            this.csvEscape(String(checklistTotal)),
            this.csvEscape(String(checklistDone)),
            this.csvEscape('0'),
            this.csvEscape(String((card.comments || []).length)),
            this.csvEscape(card.updated_at || card.created_at || ''),
            this.csvEscape(column.id || ''),
            this.csvEscape(column.name || ''),
            this.csvEscape(data.board?.id || ''),
            this.csvEscape(data.board?.title || this.boardTitle || ''),
            this.csvEscape(String(!!card.is_archived)),
            this.csvEscape(card.start_date || ''),
            this.csvEscape(String(dueComplete)),
            this.csvEscape(card.due_reminder != null ? String(card.due_reminder) : '')
          ].join(','));
        });
      });

      const csv = '\uFEFF' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, `${this.safeFileName(this.boardTitle || data.board?.title || 'board')}.csv`);
    });
  }

  close() {
    this.closed.emit();
  }

  resolveAvatarUrl(url?: string): string {
    return toBackendUrl(url);
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private csvEscape(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private safeFileName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildPrintHtml(data: any): string {
    const title = this.escapeHtml(this.boardTitle || data.board?.title || 'Board');
    const now = new Date();
    const generatedAt = this.escapeHtml(now.toLocaleString());
    const monthLabel = this.escapeHtml(now.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }));
    const weekdayLabel = this.escapeHtml(now.toLocaleDateString(undefined, { weekday: 'short' }));
    const dayLabel = this.escapeHtml(String(now.getDate()));
    const boardUrl = this.escapeHtml(`${window.location.origin}/board/${data.board?.id || this.boardId || ''}`);
    const columns = data.columns || [];
    const allCards = columns.flatMap((c: any) => c.cards || []);
    const totalCards = allCards.length;
    const dueCards = allCards.filter((c: any) => !!c.due_date).length;
    const memberIds = new Set<string>();
    allCards.forEach((card: any) => (card.members || []).forEach((m: any) => memberIds.add(m.id)));
    const totalMembers = memberIds.size;
    const boardId = this.escapeHtml(data.board?.id || this.boardId || '');

    const calendarBlock = `
      <section class="calendar-shell">
        <div class="calendar-toolbar">
          <span class="month">${monthLabel}</span>
          <span class="nav">&lsaquo;</span>
          <span class="nav">&rsaquo;</span>
          <span class="today">Today</span>
          <span class="right-dots">&bull;&bull;&bull;</span>
        </div>
        <div class="calendar-grid">
          <div class="day-col">
            <div class="weekday">${weekdayLabel}</div>
            <div class="day">${dayLabel}</div>
          </div>
          <div class="hours">
            <div class="hour">All day</div>
            <div class="hour">9 am</div>
            <div class="hour">10 am</div>
            <div class="hour">11 am</div>
          </div>
        </div>
      </section>
    `;

    const columnsHtml = columns.map((column: any) => {
      const cardsHtml = (column.cards || []).map((card: any) => {
        const labels = (card.labels || []).map((l: any) => `<span class="label" style="background:${this.escapeHtml(l.color || '#334155')}"></span>`).join('');
        const desc = this.escapeHtml((card.description || '').replace(/\s+/g, ' ').trim()).slice(0, 90);
        const due = card.due_date ? this.escapeHtml(new Date(card.due_date).toLocaleDateString()) : '';
        const checklistItems = (card.checklists || []).flatMap((c: any) => c.items || []);
        const checklistDone = checklistItems.filter((i: any) => !!i.is_completed).length;
        const checklistSummary = checklistItems.length ? `${checklistDone}/${checklistItems.length}` : '';
        const commentsCount = (card.comments || []).length;

        return `
          <article class="card">
            <div class="labels">${labels}</div>
            <h4>${this.escapeHtml(card.title || 'Untitled')}</h4>
            ${desc ? `<p class="desc">${desc}</p>` : ''}
            <div class="meta-line">
              ${due ? `<span>Due ${due}</span>` : ''}
              ${checklistSummary ? `<span>Checklist ${checklistSummary}</span>` : ''}
              ${commentsCount ? `<span>Comments ${commentsCount}</span>` : ''}
            </div>
          </article>
        `;
      }).join('') || '<div class="empty">No cards</div>';

      return `
        <section class="column">
          <header>
            <h3>${this.escapeHtml(column.name || 'Column')}</h3>
            <span>${(column.cards || []).length}</span>
          </header>
          <div class="cards">${cardsHtml}</div>
        </section>
      `;
    }).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} - Print</title>
  <style>
    @page { size: landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; background: #ffffff; }
    .print-head { display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; font-size: 12px; color:#374151; }
    .print-head .center { font-weight: 700; letter-spacing: .2px; }
    .sheet { border:1px solid #d6dae3; border-radius: 14px; padding: 12px; }
    .calendar-shell { border:1px solid #d1d5db; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; }
    .calendar-toolbar { display:flex; align-items:center; gap:10px; margin-bottom: 8px; font-size: 14px; color:#374151; }
    .calendar-toolbar .month { font-weight: 600; }
    .calendar-toolbar .nav { font-weight: 600; color:#4b5563; }
    .calendar-toolbar .today { margin-left: 4px; font-weight: 600; color:#0f172a; }
    .calendar-toolbar .right-dots { margin-left: auto; color:#64748b; letter-spacing: 2px; }
    .calendar-grid { display:grid; grid-template-columns: 90px 1fr; min-height: 170px; }
    .day-col { border-right:1px solid #e5e7eb; padding-right: 10px; }
    .weekday { font-size: 12px; color:#6b7280; margin-top: 6px; }
    .day { font-size: 30px; font-weight: 300; color:#6b7280; }
    .hours { padding-left: 12px; }
    .hour { height: 34px; border-top:1px solid #e5e7eb; font-size: 12px; color:#6b7280; line-height: 34px; }
    .board-header { display:flex; align-items:flex-end; justify-content:space-between; gap: 16px; margin: 6px 0 10px; }
    .board-header h2 { margin:0; font-size: 28px; line-height: 1.05; color:#0f172a; }
    .board-meta { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
    .pill { border:1px solid #d5dae3; border-radius: 999px; padding: 4px 9px; font-size: 11px; color:#334155; background:#f8fafc; }
    .board { display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap; }
    .column { width: 235px; max-width: 235px; border: 1px solid #d1d5db; border-radius: 10px; background: #f8fafc; padding: 10px; break-inside: avoid; min-height: 220px; }
    .column header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; }
    .column h3 { margin:0; font-size: 16px; font-weight:700; color:#374151; }
    .column header span { font-size:12px; color:#4b5563; background:#e5e7eb; border-radius:999px; padding:2px 8px; }
    .cards { display:flex; flex-direction:column; gap:8px; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; background: #fff; padding: 8px; min-height: 72px; }
    .card h4 { margin:0 0 4px; font-size: 14px; font-weight: 700; color:#1f2937; line-height: 1.25; }
    .card .desc { margin: 0 0 6px; font-size: 11px; color:#475569; line-height: 1.35; }
    .labels { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:6px; min-height: 8px; }
    .label { width: 20px; height: 6px; border-radius:999px; display:inline-block; }
    .meta-line { display:flex; flex-wrap:wrap; gap:6px; font-size:10px; color:#6b7280; }
    .meta-line span { background:#f1f5f9; border-radius: 999px; padding: 2px 6px; border: 1px solid #e2e8f0; }
    .empty { color:#64748b; font-size:12px; font-style: italic; padding: 8px 2px; }
    .footer-left { position: fixed; bottom: 2mm; left: 0; font-size: 10px; color:#6b7280; }
    .footer-right { position: fixed; bottom: 2mm; right: 0; font-size: 10px; color:#6b7280; }
    .footer-right::after { content: counter(page) "/" counter(pages); }
  </style>
</head>
<body>
  <div class="print-head">
    <div>${generatedAt}</div>
    <div class="center">${title} | Nexus</div>
    <div>Board ${boardId}</div>
  </div>
  <section class="sheet">
    ${calendarBlock}
    <div class="board-header">
      <h2>${title}</h2>
      <div class="board-meta">
        <span class="pill">Columns ${columns.length}</span>
        <span class="pill">Cards ${totalCards}</span>
        <span class="pill">Due ${dueCards}</span>
        <span class="pill">Members ${totalMembers}</span>
      </div>
    </div>
    <main class="board">${columnsHtml}</main>
  </section>
  <div class="footer-left">${boardUrl}</div>
  <div class="footer-right"></div>
</body>
</html>`;
  }

  private buildWorkspacePrintHtml(boards: any[]): string {
    const generatedAt = this.escapeHtml(new Date().toLocaleString());
    const boardSections = boards.map((boardData: any) => {
      const boardTitle = this.escapeHtml(boardData.board?.title || 'Board');
      const columns = boardData.columns || [];
      const cards = columns.flatMap((c: any) => c.cards || []);
      const columnsHtml = (boardData.columns || []).map((column: any) => {
        const cardsHtml = (column.cards || []).map((card: any) => `
          <article class="card">
            <h5>${this.escapeHtml(card.title || 'Untitled')}</h5>
          </article>
        `).join('') || '<div class="empty">No cards</div>';
        return `
          <section class="column">
            <header>${this.escapeHtml(column.name || 'Column')} <span>${(column.cards || []).length}</span></header>
            <div class="cards">${cardsHtml}</div>
          </section>
        `;
      }).join('');
      return `
        <section class="board-page">
          <div class="board-head">
            <h2>${boardTitle}</h2>
            <div class="meta">Columns ${columns.length} | Cards ${cards.length}</div>
          </div>
          <div class="board-grid">${columnsHtml}</div>
        </section>
      `;
    }).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Workspace Print - Nexus</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; background: #f8fafc; }
    .top { display:flex; justify-content:space-between; align-items:flex-end; margin: 0 0 14px 0; padding: 0 2px; }
    .top h1 { margin:0; font-size: 24px; }
    .top .meta { font-size:12px; color:#475569; }
    .board-page { margin-bottom: 22px; page-break-inside: avoid; }
    .board-head { display:flex; justify-content:space-between; align-items:flex-end; margin: 0 0 8px; }
    .board-page h2 { margin: 0; font-size: 18px; }
    .board-head .meta { font-size:11px; color:#475569; }
    .board-grid { display:grid; grid-auto-flow: column; grid-auto-columns: 250px; gap:10px; align-items:start; }
    .column { background:#e2e8f0; border:1px solid #cbd5e1; border-radius:10px; padding:8px; }
    .column header { font-size:12px; font-weight:700; color:#1e293b; display:flex; justify-content:space-between; margin-bottom:6px; text-transform: uppercase; }
    .column header span { background:#cbd5e1; border-radius:999px; padding:1px 7px; font-size:11px; }
    .cards { display:flex; flex-direction:column; gap:6px; }
    .card { background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:6px; }
    .card h5 { margin:0; font-size:12px; }
    .empty { color:#64748b; font-size:11px; font-style: italic; }
  </style>
</head>
<body>
  <div class="top">
    <h1>Workspace Snapshot | Nexus</h1>
    <div class="meta">Generated ${generatedAt}</div>
  </div>
  ${boardSections}
</body>
</html>`;
  }
}

