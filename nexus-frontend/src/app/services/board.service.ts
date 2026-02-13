import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, catchError, map, retry, tap, throwError } from 'rxjs';
import { BoardResponse, Column, Card } from '../models/board.model';
import { ToastService } from './toast.service';
import { API_BASE_URL, BACKEND_BASE_URL, toBackendUrl } from '../core/runtime-config';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private apiUrl = API_BASE_URL;
  private baseUrl = BACKEND_BASE_URL;

  // Shared refresh trigger for cross-component updates
  private refreshNeededSubject = new Subject<void>();
  refreshNeeded$ = this.refreshNeededSubject.asObservable();

  // Current session permissions
  userRole = signal<string>('member');

  triggerRefresh() {
    this.refreshNeededSubject.next();
  }

  // --- Workspaces ---

  getWorkspaces(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/workspaces`).pipe(
      catchError(err => this.handleError('Failed to load workspaces', err))
    );
  }

  createWorkspace(name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces`, { name }).pipe(
      tap(() => this.toast.show('Workspace created', 'success')),
      catchError(err => this.handleError('Failed to create workspace', err))
    );
  }

  inviteUser(workspaceId: string, email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/members`, { email }).pipe(
      tap(() => this.toast.show('Invitation sent', 'success')),
      catchError(err => this.handleError('Failed to invite user', err))
    );
  }

  getPendingInvitations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/invitations`).pipe(
      catchError(err => this.handleError('Failed to load invitations', err))
    );
  }

  acceptInvitation(workspaceId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/invitations/${workspaceId}/accept`, {}).pipe(
      tap(() => this.toast.show('Invitation accepted', 'success')),
      catchError(err => this.handleError('Failed to accept invitation', err))
    );
  }

  declineInvitation(workspaceId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/invitations/${workspaceId}/decline`, {}).pipe(
      tap(() => this.toast.show('Invitation declined', 'success')),
      catchError(err => this.handleError('Failed to decline invitation', err))
    );
  }

  // --- Workspaces ---

  updateWorkspace(workspaceId: string, name: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/workspaces/${workspaceId}`, { name }).pipe(
      tap(() => this.toast.show('Workspace updated', 'success')),
      catchError(err => this.handleError('Failed to update workspace', err))
    );
  }

  deleteWorkspace(workspaceId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/workspaces/${workspaceId}`).pipe(
      tap(() => this.toast.show('Workspace deleted', 'success')),
      catchError(err => this.handleError('Failed to delete workspace', err))
    );
  }

  // --- Leave Workspace ---
  leaveWorkspace(workspaceId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/leave`, {}).pipe(
      tap(() => this.toast.show('You left the workspace', 'success')),
      catchError(err => this.handleError('Failed to leave workspace', err))
    );
  }

  // --- Member Management ---
  getWorkspaceMembers(workspaceId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/workspaces/${workspaceId}/members`).pipe(
      map(members => members.map(member => ({
        ...member,
        user: {
          ...member.user,
          avatar_url: this.normalizeAvatarUrl(member.user?.avatar_url)
        }
      }))),
      catchError(err => this.handleError('Failed to load members', err))
    );
  }

  removeMember(workspaceId: string, userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/workspaces/${workspaceId}/members/${userId}`).pipe(
      tap(() => this.toast.show('Member removed', 'success')),
      catchError(err => this.handleError('Failed to remove member', err))
    );
  }

  updateMemberRole(workspaceId: string, userId: string, role: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/workspaces/${workspaceId}/members/${userId}`, { role }).pipe(
      tap(() => this.toast.show('Role updated', 'success')),
      catchError(err => this.handleError('Failed to update role', err))
    );
  }

  // --- Join Requests ---
  requestToJoin(workspaceId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/request`, {}).pipe(
      tap(() => this.toast.show('Join request sent', 'success')),
      catchError(err => this.handleError('Failed to send join request', err))
    );
  }

  getJoinRequests(workspaceId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/workspaces/${workspaceId}/requests`).pipe(
      map(requests => requests.map(request => ({
        ...request,
        user: {
          ...request.user,
          avatar_url: this.normalizeAvatarUrl(request.user?.avatar_url)
        }
      }))),
      catchError(err => this.handleError('Failed to load join requests', err))
    );
  }

  approveJoinRequest(workspaceId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/requests/${userId}/approve`, {}).pipe(
      tap(() => this.toast.show('Request approved', 'success')),
      catchError(err => this.handleError('Failed to approve request', err))
    );
  }

  declineJoinRequest(workspaceId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/requests/${userId}/decline`, {}).pipe(
      tap(() => this.toast.show('Request declined', 'success')),
      catchError(err => this.handleError('Failed to decline request', err))
    );
  }

  // --- Invite Links ---
  createInviteLink(workspaceId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/invite-link`, {}).pipe(
      tap(() => this.toast.show('Invite link created', 'success')),
      catchError(err => this.handleError('Failed to create invite link', err))
    );
  }

  getInviteLink(workspaceId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/workspaces/${workspaceId}/invite-link`).pipe(
      catchError(() => { return []; }) // Return empty if no link exists
    );
  }

  revokeInviteLink(workspaceId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/workspaces/${workspaceId}/invite-link`).pipe(
      tap(() => this.toast.show('Invite link revoked', 'success')),
      catchError(err => this.handleError('Failed to revoke invite link', err))
    );
  }

  joinViaLink(token: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/join/${token}`, {}).pipe(
      tap(() => this.toast.show('Successfully joined workspace!', 'success')),
      catchError(err => this.handleError('Failed to join workspace', err))
    );
  }

  // v2 API
  getBoards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/boards`).pipe(
      map((boards) => (boards || []).map((board: any) => ({
        ...board,
        background_image_url: this.normalizeAvatarUrl(board.background_image_url)
      })))
    );
  }

  getBoardTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/templates/boards`).pipe(
      catchError(err => this.handleError('Failed to load board templates', err))
    );
  }

  createBoard(title: string, workspaceId?: string, templateId?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/boards`, {
      title,
      workspace_id: workspaceId,
      template_id: templateId
    }).pipe(
      tap(() => this.toast.show('Board created', 'success')),
      catchError(err => this.handleError('Failed to create board', err))
    );
  }

  // Adjusted to use v2 endpoint
  getBoardById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/boards/${id}`).pipe(
      map(data => ({
        ...data,
        board: {
          ...data.board,
          background_image_url: this.normalizeAvatarUrl(data.board?.background_image_url)
        },
        columns: (data.columns || []).map((column: any) => ({
          ...column,
          cards: (column.cards || []).map((card: any) => ({
            ...card,
            members: (card.members || []).map((member: any) => ({
              ...member,
              avatar_url: this.normalizeAvatarUrl(member.avatar_url)
            }))
          }))
        }))
      })),
      retry(3),
      catchError(err => this.handleError('Failed to load board', err))
    );
  }

  deleteBoard(boardId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/boards/${boardId}`).pipe(
      tap(() => this.toast.show('Board deleted', 'success')),
      catchError(err => this.handleError('Failed to delete board', err))
    );
  }

  toggleBoardStar(boardId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/boards/${boardId}/star`, {}).pipe(
      catchError(err => this.handleError('Failed to toggle star', err))
    );
  }

  updateBoard(
    boardId: string,
    payload: { title?: string; background_color?: string; background_image_url?: string; documentation_notes?: string },
    options?: { silent?: boolean }
  ): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/boards/${boardId}`, payload).pipe(
      tap(() => {
        if (!options?.silent) {
          this.toast.show('Board updated', 'success');
        }
      }),
      catchError(err => this.handleError('Failed to update board', err))
    );
  }

  uploadBoardBackground(boardId: string, file: File): Observable<{ background_image_url: string }> {
    const formData = new FormData();
    formData.append('background', file);
    return this.http.post<{ background_image_url: string }>(`${this.apiUrl}/boards/${boardId}/background`, formData).pipe(
      map((res) => ({ ...res, background_image_url: this.normalizeAvatarUrl(res.background_image_url) || '' })),
      tap(() => this.toast.show('Background uploaded', 'success')),
      catchError(err => this.handleError('Failed to upload board background', err))
    );
  }

  // Deprecated usage mapping (optional fallback)
  getBoard(): Observable<BoardResponse> {
    // This will fail if server disabled /board
    // Ideally we remove this but components might depend on it.
    // Let's redirect to using getBoardById in components.
    // Returning throwError to enforce refactor
    return throwError(() => 'Deprecated: Use getBoardById');
  }

  // --- Columns ---

  createColumn(name: string, boardId: string): Observable<Column> {
    return this.http.post<Column>(`${this.apiUrl}/columns`, { name, board_id: boardId }).pipe(
      tap(() => this.toast.show('Column created', 'success')),
      catchError(err => this.handleError('Failed to create column', err))
    );
  }

  deleteColumn(columnId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/columns/${columnId}`).pipe(
      tap(() => this.toast.show('Column deleted', 'success')),
      catchError(err => this.handleError('Failed to delete column', err))
    );
  }

  updateColumn(columnId: string, name: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/columns/${columnId}`, { name }).pipe(
      tap(() => this.toast.show('Column updated', 'success')),
      catchError(err => this.handleError('Failed to update column', err))
    );
  }

  moveColumn(columnId: string, position: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/columns/${columnId}/move`, { position }).pipe(
      catchError(err => this.handleError('Failed to move column', err))
    );
  }

  // --- Cards ---

  createCard(columnId: string, title: string, templateId?: string): Observable<Card> {
    return this.http.post<Card>(`${this.apiUrl}/columns/${columnId}/cards`, {
      title,
      template_id: templateId
    }).pipe(
      tap(() => this.toast.show('Card created', 'success')),
      catchError(err => this.handleError('Failed to create card', err))
    );
  }

  updateCard(cardId: string, payload: { title?: string }): Observable<Card> {
    return this.http.patch<Card>(`${this.apiUrl}/cards/${cardId}`, payload).pipe(
      tap(() => this.toast.show('Card updated', 'success')),
      catchError(err => this.handleError('Failed to update card', err))
    );
  }

  moveCard(cardId: string, payload: { column_id?: string; position: number }) {
    return this.http.patch(`${this.apiUrl}/cards/${cardId}/move`, payload).pipe(
      retry(2), // Retry moves for resilience
      catchError(err => {
        this.toast.show('Failed to move card', 'error');
        // Re-throw so component can rollback if needed
        return throwError(() => err);
      })
    );
  }

  copyCard(cardId: string, targetColumnId: string): Observable<Card> {
    return this.http.post<Card>(`${this.apiUrl}/cards/${cardId}/copy`, { target_column_id: targetColumnId }).pipe(
      tap(() => this.toast.show('Card copied', 'success')),
      catchError(err => this.handleError('Failed to copy card', err))
    );
  }

  deleteCard(cardId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cards/${cardId}`).pipe(
      tap(() => this.toast.show('Card deleted', 'success')),
      catchError(err => this.handleError('Failed to delete card', err))
    );
  }

  archiveCard(cardId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/cards/${cardId}/archive`, {}).pipe(
      tap(() => this.toast.show('Card archived', 'success')),
      catchError(err => this.handleError('Failed to archive card', err))
    );
  }

  saveCardAsTemplate(cardId: string, templateName: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cards/${cardId}/template`, { template_name: templateName }).pipe(
      tap(() => this.toast.show('Card saved as template', 'success')),
      catchError(err => this.handleError('Failed to save card template', err))
    );
  }

  getCardTemplates(boardId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cards/templates`, { params: { board_id: boardId } }).pipe(
      catchError(err => this.handleError('Failed to load card templates', err))
    );
  }

  restoreCard(cardId: string, columnId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/cards/${cardId}/restore`, { column_id: columnId }).pipe(
      tap(() => this.toast.show('Card restored', 'success')),
      catchError(err => this.handleError('Failed to restore card', err))
    );
  }

  getArchivedCards(boardId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/boards/${boardId}/archived-cards`).pipe(
      catchError(err => this.handleError('Failed to load archived cards', err))
    );
  }

  getBoardAnalytics(boardId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/boards/${boardId}/analytics`).pipe(
      catchError(err => this.handleError('Failed to load analytics', err))
    );
  }

  private handleError(msg: string, err: any) {
    this.toast.show(msg, 'error');
    console.error(msg, err);
    return throwError(() => err);
  }

  private normalizeAvatarUrl(avatarUrl?: string): string | undefined {
    return toBackendUrl(avatarUrl);
  }
}
