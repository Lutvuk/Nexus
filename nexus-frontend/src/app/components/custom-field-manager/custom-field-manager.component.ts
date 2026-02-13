import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomFieldService } from '../../services/custom-field.service';
import { CustomField, CustomFieldType } from '../../models/board.model';
import { DialogService } from '../../services/dialog.service';

@Component({
    selector: 'app-custom-field-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './custom-field-manager.component.html'
})
export class CustomFieldManagerComponent {
    @Input() boardId!: string;

    private customFieldService = inject(CustomFieldService);
    private dialogService = inject(DialogService);

    fields = signal<CustomField[]>([]);
    isCreating = false;

    newFieldName = '';
    newFieldType: CustomFieldType = 'text';
    newFieldOptions = ''; // Comma separated

    fieldTypes: { value: CustomFieldType, label: string, help: string }[] = [
        { value: 'text', label: 'Text', help: 'Plain text like client name or notes.' },
        { value: 'number', label: 'Number', help: 'Numeric value like estimate or budget.' },
        { value: 'date', label: 'Date', help: 'Calendar date like launch day.' },
        { value: 'dropdown', label: 'Dropdown', help: 'Pick from predefined options.' },
        { value: 'checkbox', label: 'Checkbox', help: 'Yes or No value for quick status.' }
    ];

    selectedTypeHelp = signal<string>(this.fieldTypes[0].help);

    ngOnInit() {
        this.loadFields();
    }

    loadFields() {
        this.customFieldService.getFields(this.boardId).subscribe(fields => {
            this.fields.set(fields);
        });
    }

    createField() {
        const name = this.newFieldName.trim();
        if (!name) return;

        let options: string[] | undefined;
        if (this.newFieldType === 'dropdown') {
            options = this.newFieldOptions
                .split(',')
                .map(o => o.trim())
                .filter(Boolean);
            if (!options.length) return;
        }

        this.customFieldService.createField(this.boardId, name, this.newFieldType, options).subscribe({
            next: () => {
                this.loadFields();
                this.isCreating = false;
                this.resetForm();
            }
        });
    }

    async deleteField(field: CustomField) {
        const confirmed = await this.dialogService.openConfirm({
            title: 'Delete Custom Field?',
            message: `Field "${field.name}" and all its values will be removed from cards.`,
            confirmLabel: 'Delete',
            isDanger: true,
            type: 'confirm'
        });
        if (!confirmed) return;

        this.customFieldService.deleteField(field.id).subscribe(() => {
            this.loadFields();
        });
    }

    setFieldType(type: CustomFieldType) {
        this.newFieldType = type;
        const cfg = this.fieldTypes.find(t => t.value === type);
        this.selectedTypeHelp.set(cfg?.help || '');
    }

    resetForm() {
        this.newFieldName = '';
        this.newFieldType = 'text';
        this.newFieldOptions = '';
        this.selectedTypeHelp.set(this.fieldTypes[0].help);
    }

    canSave(): boolean {
        if (!this.newFieldName.trim()) return false;
        if (this.newFieldType !== 'dropdown') return true;
        return this.newFieldOptions.split(',').map(o => o.trim()).filter(Boolean).length > 0;
    }

    getTypeLabel(type: CustomFieldType): string {
        return this.fieldTypes.find(t => t.value === type)?.label || type;
    }

    getIconForType(type: CustomFieldType): string {
        switch (type) {
            case 'text': return 'Aa';
            case 'number': return '#';
            case 'date': return 'Dt';
            case 'dropdown': return 'V';
            case 'checkbox': return 'Yn';
            default: return '?';
        }
    }
}
