export declare class DashboardEventDto {
    type: 'opened' | 'card' | 'action' | 'exit' | 'attention_resolved';
    card?: 'financial' | 'inventory' | 'attention' | 'recommendations';
    firstClick?: boolean;
    action?: string;
    loadTimeMs?: number;
    sessionId?: string;
    durationMs?: number;
    cardsViewed?: number;
    actionsTaken?: number;
    firstCard?: 'financial' | 'inventory' | 'attention' | 'recommendations';
    openedAt?: string;
    closedAt?: string;
    itemId?: string;
    itemType?: string;
    resolution?: string;
}
