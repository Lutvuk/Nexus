import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/runtime-config';

export type TriggerType =
    'CARD_MOVED'
    | 'CARD_CREATED'
    | 'LABEL_ADDED'
    | 'MEMBER_ADDED'
    | 'CHECKLIST_DONE'
    | 'CARD_COMPLETED'
    | 'DUE_DATE_SET'
    | 'CALENDAR_DATE_SET'
    | 'DUE_DATE_OVERDUE';
export type ActionType =
    'MOVE_CARD'
    | 'ADD_LABEL'
    | 'SET_COMPLETE'
    | 'ASSIGN_MEMBER'
    | 'ARCHIVE_CARD'
    | 'SET_DUE_DATE'
    | 'NOTIFY_ASSIGNEES'
    | 'NOTIFY_ADMINS';

export interface AutomationRule {
    id: string;
    board_id: string;
    name: string;
    is_active: boolean;
    trigger_type: TriggerType;
    conditions: any; // JSON
    action_type: ActionType;
    action_params: any; // JSON
    created_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AutomationService {
    private http = inject(HttpClient);
    private apiUrl = API_BASE_URL;

    getRules(boardId: string): Observable<AutomationRule[]> {
        return this.http.get<AutomationRule[]>(`${this.apiUrl}/boards/${boardId}/rules`);
    }

    createRule(boardId: string, rule: Partial<AutomationRule>): Observable<AutomationRule> {
        return this.http.post<AutomationRule>(`${this.apiUrl}/boards/${boardId}/rules`, rule);
    }

    deleteRule(ruleId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/rules/${ruleId}`);
    }

    toggleRule(ruleId: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/rules/${ruleId}/toggle`, {});
    }
}
