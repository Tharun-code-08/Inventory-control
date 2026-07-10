import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
export type PlatformAuditAction = 'platform_dashboard_view' | 'platform_subscription_backfill' | 'platform_notification_read' | 'platform_notification_read_all' | 'platform_health_view';
export declare class PlatformAuditService {
    private readonly audit;
    constructor(audit: AuditService);
    logPlatformAction(args: {
        userId: string;
        adminEmail: string;
        action: PlatformAuditAction;
        entityType?: string;
        entityId?: string;
        recordCode?: string;
        auditAction?: AuditAction;
        extra?: Record<string, unknown>;
    }): Promise<void>;
}
