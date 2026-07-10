import type { RequestUser } from '../../common/types/request-user';
import { AlertsService } from './alerts.service';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
export declare class AlertsController {
    private readonly alerts;
    constructor(alerts: AlertsService);
    list(user: RequestUser): Promise<{
        shopId: string | null;
        message: string;
        id: string;
        title: string;
        alertType: import(".prisma/client").$Enums.AlertType;
        severity: string;
        referenceType: string | null;
        referenceId: string | null;
        isRead: boolean;
        triggeredAt: Date;
        resolvedAt: Date | null;
    }[]>;
    markRead(user: RequestUser, id: string): Promise<{
        shopId: string | null;
        message: string;
        id: string;
        title: string;
        alertType: import(".prisma/client").$Enums.AlertType;
        severity: string;
        referenceType: string | null;
        referenceId: string | null;
        isRead: boolean;
        triggeredAt: Date;
        resolvedAt: Date | null;
    }>;
    runChecks(): Promise<{
        generated: number;
    }>;
    runRetention(): Promise<{
        daysToKeep: number;
        cutoff: string;
        deleted: number;
    }>;
    getNotificationConfig(user: RequestUser): Promise<import("@prisma/client/runtime/library").JsonValue | {
        version: string;
        groups: {
            id: string;
            title: string;
            moduleTags: string[];
            rules: {
                id: string;
                title: string;
                notifyTo: string;
                severity: string;
                channels: string[];
            }[];
        }[];
    }>;
    updateNotificationConfig(user: RequestUser, dto: UpdateNotificationConfigDto): Promise<import("@prisma/client/runtime/library").JsonValue>;
}
