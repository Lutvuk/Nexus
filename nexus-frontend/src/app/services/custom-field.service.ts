import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomField, CardCustomFieldValue, CustomFieldType } from '../models/board.model';
import { API_BASE_URL } from '../core/runtime-config';

@Injectable({
    providedIn: 'root'
})
export class CustomFieldService {
    private http = inject(HttpClient);
    private apiUrl = API_BASE_URL;

    // --- Fields ---

    getFields(boardId: string): Observable<CustomField[]> {
        return this.http.get<CustomField[]>(`${this.apiUrl}/boards/${boardId}/fields`);
    }

    createField(boardId: string, name: string, type: CustomFieldType, options?: string[]): Observable<CustomField> {
        return this.http.post<CustomField>(`${this.apiUrl}/boards/${boardId}/fields`, { name, type, options });
    }

    deleteField(fieldId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/fields/${fieldId}`);
    }

    // --- Values ---

    getCardValues(cardId: string): Observable<CardCustomFieldValue[]> {
        return this.http.get<CardCustomFieldValue[]>(`${this.apiUrl}/cards/${cardId}/fields`);
    }

    setValue(cardId: string, fieldId: string, value: any): Observable<CardCustomFieldValue> {
        return this.http.post<CardCustomFieldValue>(`${this.apiUrl}/cards/${cardId}/fields/${fieldId}`, { value });
    }
}
