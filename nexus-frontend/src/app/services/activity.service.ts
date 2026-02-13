import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Activity } from '../models/board.model';
import { ToastService } from './toast.service';
import { API_BASE_URL } from '../core/runtime-config';

@Injectable({
    providedIn: 'root'
})
export class ActivityService {
    private http = inject(HttpClient);
    private toast = inject(ToastService);
    private apiUrl = API_BASE_URL;

    getBoardActivity(boardId: string, limit: number = 20): Observable<Activity[]> {
        return this.http.get<Activity[]>(`${this.apiUrl}/boards/${boardId}/activity?limit=${limit}`).pipe(
            catchError(err => this.handleError('Failed to load board activity', err))
        );
    }

    getCardActivity(cardId: string): Observable<Activity[]> {
        return this.http.get<Activity[]>(`${this.apiUrl}/cards/${cardId}/activity`).pipe(
            catchError(err => this.handleError('Failed to load card activity', err))
        );
    }

    private handleError(msg: string, err: any) {
        console.error(msg, err);
        // Don't toast for background activity fetches usually, unless critical
        return throwError(() => err);
    }
}
