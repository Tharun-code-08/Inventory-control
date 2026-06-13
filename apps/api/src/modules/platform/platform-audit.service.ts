import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { auditRequestMetadata } from '../../common/utils/audit-context';
import { AuditService } from '../audit/audit.service';

export type PlatformAuditAction =
  | 'platform_dashboard_view'
  | 'platform_subscription_backfill'
  | 'platform_notification_read'
  | 'platform_notification_read_all'
  | 'platform_health_view';

@Injectable()
export class PlatformAuditService {
  constructor(private readonly audit: AuditService) {}

  async logPlatformAction(args: {
    userId: string;
    adminEmail: string;
    action: PlatformAuditAction;
    entityType?: string;
    entityId?: string;
    recordCode?: string;
    auditAction?: AuditAction;
    extra?: Record<string, unknown>;
  }) {
    const meta = auditRequestMetadata();
    await this.audit.log({
      userId: args.userId,
      companyId: null,
      action: args.auditAction ?? AuditAction.EXPORT_AUDIT,
      entityType: args.entityType ?? 'PlatformAdmin',
      entityId: args.entityId ?? args.userId,
      newValues: {
        platformAction: args.action,
        adminEmail: args.adminEmail,
        recordCode: args.recordCode ?? null,
        ...args.extra,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}
