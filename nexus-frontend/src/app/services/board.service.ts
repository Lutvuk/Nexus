import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, retry, tap, throwError } from 'rxjs';
import { BoardResponse, Column, Card } from '../models/board.model';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private apiUrl = 'http://localhost:8080/api/v1';

  getBoard(): Observable<BoardResponse> {
    return this.http.get<BoardResponse>(`${this.apiUrl}/board`).pipe(
      retry(3),
      catchError(err => this.handleError('Failed to load board', err))
    );
  }

  // --- Columns ---

  createColumn(name: string): Observable<Column> {
    return this.http.post<Column>(`${this.apiUrl}/columns`, { name }).pipe(
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

  // --- Cards ---

  createCard(columnId: string, title: string): Observable<Card> {
    return this.http.post<Card>(`${this.apiUrl}/columns/${columnId}/cards`, { title }).pipe(
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

  deleteCard(cardId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cards/${cardId}`).pipe(
      tap(() => this.toast.show('Card deleted', 'success')),
      catchError(err => this.handleError('Failed to delete card', err))
    );
  }

  private handleError(msg: string, err: any) {
    this.toast.show(msg, 'error');
    console.error(msg, err);
    return throwError(() => err);
  }
}
