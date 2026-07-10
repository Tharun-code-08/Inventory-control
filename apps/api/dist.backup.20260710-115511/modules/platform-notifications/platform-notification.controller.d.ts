import type { RequestUser } from '../../common/types/request-user';
import { PlatformAuditService } from '../platform/platform-audit.service';
import { PlatformHealthService } from './platform-health.service';
import { PlatformNotificationService } from './platform-notification.service';
export declare class PlatformNotificationController {
    private readonly notifications;
    private readonly health;
    private readonly platformAudit;
    constructor(notifications: PlatformNotificationService, health: PlatformHealthService, platformAudit: PlatformAuditService);
    list(user: RequestUser, unreadOnly?: string, limit?: string): Promise<{
        id: string;
        category: import(".prisma/client").$Enums.PlatformNotificationCategory;
        severity: import(".prisma/client").$Enums.PlatformNotificationSeverity;
        notificationKey: string;
        title: string;
        message: string;
        actionUrl: string | null;
        companyId: string | null;
        referenceType: string | null;
        referenceId: string | null;
        createdAt: string;
        isRead: boolean;
        readAt: string;
    }[]>;
    unreadCount(user: RequestUser): Promise<{
        count: number;
    }>;
    markRead(user: RequestUser, id: string): Promise<{
        ok: boolean;
    }>;
    markAllRead(user: RequestUser): Promise<{
        updated: number;
    }>;
    healthSnapshot(user: RequestUser): Promise<{
        timestamp: string;
        database: {
            sizeBytes: number;
            limitBytes: number;
            usagePct: number;
        };
        disk: {
            path: string;
            freePct: number;
            freeBytes: number;
        }[];
        queues: Record<string, {
            waiting: number;
            active: number;
            failed: number;
            delayed: number;
        }>;
        cpuLoadPct: number;
        memoryUsagePct: number;
        httpErrorsDelta5m: number;
    }>;
}
