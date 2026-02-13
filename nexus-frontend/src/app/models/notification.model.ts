export type NotificationType = 'ASSIGNMENT' | 'MENTION' | 'DUE_SOON';

export interface NexusNotification {
    id: string;
    user_id: string;
    actor_id?: string;
    actor?: {
        id: string;
        name: string;
        avatar_url?: string;
    };
    type: NotificationType;
    title: string;
    message: string;
    entity_id: string;
    entity_type: 'CARD' | 'BOARD';
    board_id?: string;
    is_read: boolean;
    created_at: string;
}
