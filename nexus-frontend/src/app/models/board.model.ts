export interface ChecklistItem {
    id: string;
    title: string;
    is_completed: boolean;
    position: number;
    checklist_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Checklist {
    id: string;
    title: string;
    card_id: string;
    items: ChecklistItem[];
    position: number;
    created_at?: string;
    updated_at?: string;
}



export interface Label {
    id: string;
    board_id: string;
    name: string;
    color: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
}

export interface Comment {
    id: string;
    card_id: string;
    user_id: string;
    user?: User;
    content: string;
    created_at?: string;
    updated_at?: string;
}

export interface Attachment {
    id: string;
    card_id: string;
    user_id: string;
    filename: string;
    file_path: string;
    file_type: string;
    size: number;
    created_at: string;
}

export interface Card {
    id: string;
    title: string;
    description?: string;
    column_id: string;
    column?: { board_id: string }; // Populated if preloaded
    labels?: Label[];
    members?: { id: string; name: string; email: string; avatar_url?: string }[];
    due_date?: string;
    is_complete: boolean;
    position: number;
    checklists?: Checklist[];
    comments?: Comment[];
    attachments?: Attachment[];
    custom_field_values?: CardCustomFieldValue[];
    cover_attachment_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Column {
    id: string;
    name: string;
    position: number;
    cards: Card[];
    card_count: number;
    created_at?: string;
    updated_at?: string;
}

export interface Activity {
    id: string;
    user_id: string;
    user?: User;
    board_id: string;
    action: string;
    target_id: string;
    metadata?: any; // JSON
    created_at: string;
}

export interface BoardResponse {
    board: {
        id: string;
        title: string;
        is_starred: boolean;
        workspace_id: string;
        background_color?: string;
        background_image_url?: string;
        documentation_notes?: string;
        custom_fields?: CustomField[];
    };
    columns: Column[];
    user_role: string;
}

export interface BoardTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    data: any; // JSON containing columns
    created_at: string;
    updated_at: string;
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

export interface CustomField {
    id: string;
    board_id: string;
    name: string;
    type: CustomFieldType;
    options?: string[]; // For dropdowns
    position: number;
}

export interface CardCustomFieldValue {
    id: string;
    card_id: string;
    custom_field_id: string;
    custom_field?: CustomField;
    value_text?: string;
    value_number?: number;
    value_date?: string;
    value_bool?: boolean;
}
