import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutomationService, AutomationRule, TriggerType, ActionType } from '../../services/automation.service';
import { BoardService } from '../../services/board.service';
import { LabelService } from '../../services/label.service';
import { DialogService } from '../../services/dialog.service';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-automation-rules',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './automation-rules.component.html',
})
export class AutomationRulesComponent {
    @Input({ required: true }) boardId!: string;
    @Output() close = new EventEmitter<void>();

    private automationService = inject(AutomationService);
    private boardService = inject(BoardService);
    private labelService = inject(LabelService);
    private dialogService = inject(DialogService);
    private toast = inject(ToastService);

    rules = signal<AutomationRule[]>([]);
    isLoading = signal(false);
    showForm = signal(false);
    activePanel = signal<'rules' | 'calendar' | 'dueDate'>('rules');

    selectedTrigger = signal<TriggerType>('CARD_MOVED');
    selectedAction = signal<ActionType>('MOVE_CARD');

    columns = signal<any[]>([]);
    labels = this.labelService.labels;
    members = signal<any[]>([]);

    conditionColumnId = signal('');
    conditionLabelId = signal('');
    paramColumnId = signal('');
    paramLabelId = signal('');
    paramUserId = signal('');
    paramDueDays = signal(0);

    ngOnInit() {
        this.loadRules();
        this.loadBoardData();
    }

    loadRules(silent = false) {
        if (!silent) this.isLoading.set(true);
        this.automationService.getRules(this.boardId).subscribe({
            next: (data) => {
                this.rules.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load rules', err);
                this.isLoading.set(false);
            }
        });
    }

    loadBoardData() {
        this.boardService.getBoardById(this.boardId).subscribe(board => {
            this.columns.set(board.columns || []);
            const workspaceId = board?.board?.workspace_id;
            if (workspaceId) {
                this.boardService.getWorkspaceMembers(workspaceId).subscribe(members => {
                    this.members.set((members || []).map((m: any) => m.user || m));
                });
            }
        });
        this.labelService.loadLabels(this.boardId);
    }

    createRule() {
        const trigger = this.selectedTrigger();
        const action = this.selectedAction();
        const conditions: any = {};
        const params: any = {};
        let name = '';

        if (trigger === 'CARD_MOVED') {
            const colName = this.columns().find(c => c.id === this.conditionColumnId())?.name || 'any column';
            if (this.conditionColumnId()) conditions['to_column_id'] = this.conditionColumnId();
            name = `When a card is moved to "${colName}"`;
        } else if (trigger === 'CARD_CREATED') {
            const colName = this.columns().find(c => c.id === this.conditionColumnId())?.name || 'any column';
            if (this.conditionColumnId()) conditions['column_id'] = this.conditionColumnId();
            name = `When a card is created in "${colName}"`;
        } else if (trigger === 'LABEL_ADDED') {
            const labelName = this.labels().find(l => l.id === this.conditionLabelId())?.name || 'any label';
            if (this.conditionLabelId()) conditions['label_id'] = this.conditionLabelId();
            name = `When label "${labelName}" is added to a card`;
        } else if (trigger === 'CARD_COMPLETED') {
            name = 'When a card is marked complete';
        } else if (trigger === 'CHECKLIST_DONE') {
            name = 'When a checklist is completed';
        } else if (trigger === 'DUE_DATE_SET') {
            name = 'When a card due date is set';
        } else if (trigger === 'CALENDAR_DATE_SET') {
            name = 'When a card is dated in calendar';
        } else if (trigger === 'DUE_DATE_OVERDUE') {
            conditions['is_overdue'] = true;
            name = 'When a card becomes overdue';
        }

        if (action === 'MOVE_CARD') {
            params['target_column_id'] = this.paramColumnId();
            const colName = this.columns().find(c => c.id === this.paramColumnId())?.name || '...';
            name += `, then move it to "${colName}"`;
        } else if (action === 'ADD_LABEL') {
            params['label_id'] = this.paramLabelId();
            const labelName = this.labels().find(l => l.id === this.paramLabelId())?.name || '...';
            name += `, then add label "${labelName}"`;
        } else if (action === 'SET_COMPLETE') {
            name += ', then mark it complete';
        } else if (action === 'ASSIGN_MEMBER') {
            params['user_id'] = this.paramUserId();
            const member = this.members().find(m => m.id === this.paramUserId());
            const memberName = member?.username || member?.name || '...';
            name += `, then assign it to "${memberName}"`;
        } else if (action === 'ARCHIVE_CARD') {
            name += ', then archive it';
        } else if (action === 'SET_DUE_DATE') {
            params['days_from_now'] = this.paramDueDays();
            name += `, then set due date in ${this.paramDueDays()} day(s)`;
        } else if (action === 'NOTIFY_ASSIGNEES') {
            params['title'] = 'Overdue card alert';
            params['message'] = 'A card assigned to you is overdue.';
            name += ', then notify assignees';
        } else if (action === 'NOTIFY_ADMINS') {
            params['title'] = 'Urgent card alert';
            params['message'] = 'An urgent-labeled card needs attention.';
            name += ', then notify admins';
        }

        const newRule: Partial<AutomationRule> = {
            board_id: this.boardId,
            name,
            trigger_type: trigger,
            conditions,
            action_type: action,
            action_params: params
        };

        this.automationService.createRule(this.boardId, newRule).subscribe(() => {
            this.loadRules();
            this.showForm.set(false);
            this.resetForm();
        });
    }

    createDeveloperPresets() {
        const blocked = this.columns().find(c => (c.name || '').toLowerCase().includes('blocked'));
        const done = this.columns().find(c => (c.name || '').toLowerCase().includes('done') || (c.name || '').toLowerCase().includes('closed'));
        const urgent = this.labels().find(l => (l.name || '').toLowerCase() === 'urgent');

        const payloads: Partial<AutomationRule>[] = [];

        if (blocked?.id) {
            payloads.push({
                board_id: this.boardId,
                name: 'When card is overdue, move it to Blocked',
                trigger_type: 'DUE_DATE_OVERDUE',
                conditions: { is_overdue: true },
                action_type: 'MOVE_CARD',
                action_params: { target_column_id: blocked.id }
            });
        }

        payloads.push({
            board_id: this.boardId,
            name: 'When card is overdue, notify assignees',
            trigger_type: 'DUE_DATE_OVERDUE',
            conditions: { is_overdue: true },
            action_type: 'NOTIFY_ASSIGNEES',
            action_params: { title: 'Overdue card alert', message: 'A card assigned to you is overdue.' }
        });

        if (done?.id) {
            payloads.push({
                board_id: this.boardId,
                name: 'When checklist is completed, mark card complete',
                trigger_type: 'CHECKLIST_DONE',
                conditions: {},
                action_type: 'SET_COMPLETE',
                action_params: {}
            });
        }

        if (urgent?.id) {
            payloads.push({
                board_id: this.boardId,
                name: 'When urgent label is added, notify admins',
                trigger_type: 'LABEL_ADDED',
                conditions: { label_id: urgent.id },
                action_type: 'NOTIFY_ADMINS',
                action_params: { title: 'Urgent card alert', message: 'An urgent-labeled card needs attention.' }
            });
        }

        if (payloads.length === 0) {
            this.toast.show('No suitable columns/labels found for presets', 'error');
            return;
        }

        let doneCount = 0;
        const createNext = (index: number) => {
            if (index >= payloads.length) {
                this.toast.show(`Added ${doneCount} automation preset(s)`, 'success');
                this.loadRules();
                return;
            }
            this.automationService.createRule(this.boardId, payloads[index]).subscribe({
                next: () => {
                    doneCount++;
                    createNext(index + 1);
                },
                error: () => createNext(index + 1)
            });
        };
        createNext(0);
    }

    async deleteRule(id: string) {
        const confirmed = await this.dialogService.openConfirm({
            title: 'Delete Automation Rule?',
            message: 'This rule will stop running and cannot be recovered.',
            confirmLabel: 'Delete',
            isDanger: true,
            type: 'confirm'
        });
        if (!confirmed) return;

        this.automationService.deleteRule(id).subscribe(() => this.loadRules());
    }

    toggleRule(id: string) {
        this.rules.update(rules => rules.map(r =>
            r.id === id ? { ...r, is_active: !r.is_active } : r
        ));

        this.automationService.toggleRule(id).subscribe({
            next: () => this.loadRules(true),
            error: () => {
                this.rules.update(rules => rules.map(r =>
                    r.id === id ? { ...r, is_active: !r.is_active } : r
                ));
            }
        });
    }

    getRuleIcon(trigger: TriggerType): string {
        switch (trigger) {
            case 'CARD_MOVED': return '->';
            case 'CARD_CREATED': return '+';
            case 'LABEL_ADDED': return '#';
            case 'CARD_COMPLETED': return 'ok';
            case 'CHECKLIST_DONE': return 'list';
            case 'DUE_DATE_SET': return 'date';
            case 'CALENDAR_DATE_SET': return 'cal';
            case 'DUE_DATE_OVERDUE': return '!';
            default: return 'bot';
        }
    }

    getRuleDescription(rule: AutomationRule): string {
        try {
            const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
            const params = typeof rule.action_params === 'string' ? JSON.parse(rule.action_params) : rule.action_params;

            let desc = '';

            if (rule.trigger_type === 'CARD_MOVED') {
                const colName = this.columns().find(c => c.id === conditions?.to_column_id)?.name || 'a column';
                desc = `When a card is moved to "${colName}"`;
            } else if (rule.trigger_type === 'CARD_CREATED') {
                const colName = this.columns().find(c => c.id === conditions?.column_id)?.name || 'a column';
                desc = `When a card is created in "${colName}"`;
            } else if (rule.trigger_type === 'LABEL_ADDED') {
                const labelName = this.labels().find(l => l.id === conditions?.label_id)?.name;
                desc = labelName ? `When label "${labelName}" is added` : 'When a label is added';
            } else if (rule.trigger_type === 'CARD_COMPLETED') {
                desc = 'When a card is marked complete';
            } else if (rule.trigger_type === 'CHECKLIST_DONE') {
                desc = 'When a checklist is completed';
            } else if (rule.trigger_type === 'DUE_DATE_SET') {
                desc = 'When a card due date is set';
            } else if (rule.trigger_type === 'CALENDAR_DATE_SET') {
                desc = 'When a card is dated in calendar';
            } else if (rule.trigger_type === 'DUE_DATE_OVERDUE') {
                desc = 'When a card becomes overdue';
            }

            if (rule.action_type === 'MOVE_CARD') {
                const colName = this.columns().find(c => c.id === params?.target_column_id)?.name || '...';
                desc += `, then move it to "${colName}"`;
            } else if (rule.action_type === 'ADD_LABEL') {
                const labelName = this.labels().find(l => l.id === params?.label_id)?.name || '...';
                desc += `, then add label "${labelName}"`;
            } else if (rule.action_type === 'SET_COMPLETE') {
                desc += ', then mark it complete';
            } else if (rule.action_type === 'ASSIGN_MEMBER') {
                const member = this.members().find(m => m.id === params?.user_id);
                desc += `, then assign to "${member?.username || member?.name || '...'}"`;
            } else if (rule.action_type === 'ARCHIVE_CARD') {
                desc += ', then archive it';
            } else if (rule.action_type === 'SET_DUE_DATE') {
                const days = Number(params?.days_from_now ?? 0);
                desc += `, then set due date in ${days} day(s)`;
            } else if (rule.action_type === 'NOTIFY_ASSIGNEES') {
                desc += ', then notify assignees';
            } else if (rule.action_type === 'NOTIFY_ADMINS') {
                desc += ', then notify admins';
            }

            return desc;
        } catch {
            return rule.name;
        }
    }

    resetForm() {
        this.conditionColumnId.set('');
        this.conditionLabelId.set('');
        this.paramColumnId.set('');
        this.paramLabelId.set('');
        this.paramUserId.set('');
        this.paramDueDays.set(0);
        this.selectedTrigger.set('CARD_MOVED');
        this.selectedAction.set('MOVE_CARD');
    }

    selectPanel(panel: 'rules' | 'calendar' | 'dueDate') {
        this.activePanel.set(panel);
        if (panel === 'rules') {
            this.showForm.set(false);
            this.resetForm();
        } else if (panel === 'calendar') {
            this.selectedTrigger.set('CALENDAR_DATE_SET');
            this.showForm.set(true);
        } else if (panel === 'dueDate') {
            this.selectedTrigger.set('DUE_DATE_SET');
            this.showForm.set(true);
        }
    }
}
