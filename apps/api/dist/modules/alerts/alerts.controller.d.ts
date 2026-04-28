import type { RequestUser } from '../../common/types/request-user';
import { AlertsService } from './alerts.service';
export declare class AlertsController {
    private readonly alerts;
    constructor(alerts: AlertsService);
    list(user: RequestUser): Promise<{
        shopId: string | null;
        title: string;
        id: string;
        alertType: import(".prisma/client").$Enums.AlertType;
        severity: string;
        message: string;
        referenceType: string | null;
        referenceId: string | null;
        isRead: boolean;
        triggeredAt: Date;
        resolvedAt: Date | null;
    }[]>;
    markRead(user: RequestUser, id: string): Promise<{
        shopId: string | null;
        title: string;
        id: string;
        alertType: import(".prisma/client").$Enums.AlertType;
        severity: string;
        message: string;
        referenceType: string | null;
        referenceId: string | null;
        isRead: boolean;
        triggeredAt: Date;
        resolvedAt: Date | null;
    }>;
    runChecks(): Promise<{
        generated: number;
    }>;
}
