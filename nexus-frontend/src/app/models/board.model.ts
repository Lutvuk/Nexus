export interface Card {
    id: string;
    title: string;
    description?: string;
    column_id: string;
    position: number;
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

export interface BoardResponse {
    workspace: {
        id: string;
        name: string;
        description: string;
    };
    columns: Column[];
}
