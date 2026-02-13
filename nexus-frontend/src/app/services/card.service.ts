import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { ToastService } from './toast.service';
import { API_BASE_URL } from '../core/runtime-config';

@Injectable({
    providedIn: 'root'
})
export class CardService {
    private http = inject(HttpClient);
    private toast = inject(ToastService);
    private apiUrl = API_BASE_URL;

    // Get card with checklists
    getCardById(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/cards/${id}`).pipe(
            catchError(err => this.handleError('Failed to load card', err))
        );
    }

    // Update card (title, description, due_date, is_complete)
    updateCard(id: string, payload: {
        title?: string;
        description?: string;
        due_date?: string | null;
        is_complete?: boolean;
    }): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/cards/${id}`, payload).pipe(
            tap(() => this.toast.show('Card updated', 'success')),
            catchError(err => this.handleError('Failed to update card', err))
        );
    }

    deleteCard(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/cards/${id}`).pipe(
            tap(() => this.toast.show('Card deleted', 'success')),
            catchError(err => this.handleError('Failed to delete card', err))
        );
    }

    // Checklists
    createChecklist(cardId: string, title: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/cards/${cardId}/checklists`, { title }).pipe(
            tap(() => this.toast.show('Checklist added', 'success')),
            catchError(err => this.handleError('Failed to create checklist', err))
        );
    }

    deleteChecklist(checklistId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/checklists/${checklistId}`).pipe(
            tap(() => this.toast.show('Checklist deleted', 'success')),
            catchError(err => this.handleError('Failed to delete checklist', err))
        );
    }

    moveChecklist(id: string, position: number): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/checklists/${id}/move`, { position }).pipe(
            catchError(err => this.handleError('Failed to move checklist', err))
        );
    }

    // Checklist Items
    createChecklistItem(checklistId: string, title: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/checklists/${checklistId}/items`, { title }).pipe(
            tap(() => this.toast.show('Item added', 'success')),
            catchError(err => this.handleError('Failed to create item', err))
        );
    }

    toggleChecklistItem(itemId: string, isCompleted: boolean): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/checklist-items/${itemId}`, { is_completed: isCompleted }).pipe(
            catchError(err => this.handleError('Failed to update item', err))
        );
    }

    deleteChecklistItem(itemId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/checklist-items/${itemId}`).pipe(
            catchError(err => this.handleError('Failed to delete item', err))
        );
    }

    moveChecklistItem(id: string, position: number, checklistId?: string): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/checklist-items/${id}/move`, {
            position,
            checklist_id: checklistId
        }).pipe(
            catchError(err => this.handleError('Failed to move item', err))
        );
    }

    // Metadata
    addLabel(cardId: string, labelId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/cards/${cardId}/labels/${labelId}`, {}).pipe(
            tap(() => this.toast.show('Label added', 'success')),
            catchError(err => this.handleError('Failed to add label', err))
        );
    }

    removeLabel(cardId: string, labelId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/cards/${cardId}/labels/${labelId}`).pipe(
            tap(() => this.toast.show('Label removed', 'success')),
            catchError(err => this.handleError('Failed to remove label', err))
        );
    }

    addMember(cardId: string, userId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/cards/${cardId}/members/${userId}`, {}).pipe(
            tap(() => this.toast.show('Member added', 'success')),
            catchError(err => this.handleError('Failed to add member', err))
        );
    }

    removeMember(cardId: string, userId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/cards/${cardId}/members/${userId}`).pipe(
            tap(() => this.toast.show('Member removed', 'success')),
            catchError(err => this.handleError('Failed to remove member', err))
        );
    }

    // Comments
    createComment(cardId: string, content: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/cards/${cardId}/comments`, { content }).pipe(
            tap(() => this.toast.show('Comment posted', 'success')),
            catchError(err => this.handleError('Failed to post comment', err))
        );
    }

    deleteComment(commentId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/comments/${commentId}`).pipe(
            tap(() => this.toast.show('Comment deleted', 'success')),
            catchError(err => this.handleError('Failed to delete comment', err))
        );
    }

    // Attachments
    uploadAttachment(cardId: string, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<any>(`${this.apiUrl}/cards/${cardId}/attachments`, formData).pipe(
            tap(() => this.toast.show('File uploaded', 'success')),
            catchError(err => this.handleError('Failed to upload file', err))
        );
    }

    deleteAttachment(attachmentId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/attachments/${attachmentId}`).pipe(
            tap(() => this.toast.show('Attachment deleted', 'success')),
            catchError(err => this.handleError('Failed to delete attachment', err))
        );
    }

    makeCover(cardId: string, attachmentId: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/cards/${cardId}/cover`, { attachment_id: attachmentId }).pipe(
            tap(() => this.toast.show('Cover updated', 'success')),
            catchError(err => this.handleError('Failed to update cover', err))
        );
    }

    removeCover(cardId: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/cards/${cardId}/cover`).pipe(
            tap(() => this.toast.show('Cover removed', 'success')),
            catchError(err => this.handleError('Failed to remove cover', err))
        );
    }

    // Subscriptions (Watch)
    subscribe(entityId: string, type: 'CARD' | 'COLUMN' = 'CARD'): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/subscribe/${entityId}?type=${type}`, {}).pipe(
            tap(() => this.toast.show('You are now watching this', 'success')),
            catchError(err => this.handleError('Failed to subscribe', err))
        );
    }

    unsubscribe(entityId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/subscribe/${entityId}`).pipe(
            tap(() => this.toast.show('You stopped watching this', 'success')),
            catchError(err => this.handleError('Failed to unsubscribe', err))
        );
    }

    getSubscriptionStatus(entityId: string): Observable<{ is_subscribed: boolean }> {
        return this.http.get<{ is_subscribed: boolean }>(`${this.apiUrl}/subscribe/${entityId}/status`).pipe(
            catchError(err => this.handleError('Failed to get watch status', err))
        );
    }

    private handleError(msg: string, err: any) {
        this.toast.show(msg, 'error');
        console.error(msg, err);
        return throwError(() => err);
    }
}
