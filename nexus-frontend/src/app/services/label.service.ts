import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Label } from '../models/label.model';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/runtime-config';

@Injectable({
    providedIn: 'root'
})
export class LabelService {
    private apiUrl = API_BASE_URL;

    // Signals
    labels = signal<Label[]>([]);

    constructor(private http: HttpClient) { }

    loadLabels(boardId: string) {
        this.http.get<Label[]>(`${this.apiUrl}/boards/${boardId}/labels`).subscribe({
            next: (labels) => this.labels.set(labels),
            error: (err) => console.error('Failed to load labels', err)
        });
    }

    createLabel(boardId: string, name: string, color: string): Observable<Label> {
        return this.http.post<Label>(`${this.apiUrl}/boards/${boardId}/labels`, { name, color }).pipe(
            tap(newLabel => {
                this.labels.update(labels => [...labels, newLabel]);
            })
        );
    }

    updateLabel(id: string, name: string, color: string): Observable<Label> {
        return this.http.patch<Label>(`${this.apiUrl}/labels/${id}`, { name, color }).pipe(
            tap(updatedLabel => {
                this.labels.update(labels => labels.map(l => l.id === id ? updatedLabel : l));
            })
        );
    }

    deleteLabel(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/labels/${id}`).pipe(
            tap(() => {
                this.labels.update(labels => labels.filter(l => l.id !== id));
            })
        );
    }
}
