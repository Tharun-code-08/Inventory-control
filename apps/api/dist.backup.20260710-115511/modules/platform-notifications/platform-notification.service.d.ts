import { ConfigService } from '@nestjs/config';
import { PlatformNotificationCategory, PlatformNotificationSeverity } from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
export type DispatchPlatformNotificationArgs = {
    category: PlatformNotificationCategory;
    severity: PlatformNotificationSeverity;
    notificationKey: string;
    title: string;
    message: string;
    actionUrl?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    companyId?: string | null;
    dedupeHours?: number;
    emailImmediate?: boolean;
    emailDedupe?: {
        templateId: string;
        entityType: string;
        entityId: string;
    };
};
export declare class PlatformNotificationService {
    private readonly prisma;
    private readonly config;
    private readonly mail;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, mail?: MailService | null);
    parseAdminEmails(): string[];
    private hasRecentDuplicate;
    dispatch(args: DispatchPlatformNotificationArgs): Promise<{
        skipped: "duplicate";
        notificationId?: undefined;
    } | {
        notificationId: string;
        skipped?: undefined;
    }>;
    emailAdmins(args: {
        title: string;
        message: string;
        dedupe?: {
            templateId: string;
            entityType: string;
            entityId: string;
        };
    }): Promise<{
        sent: number;
    }>;
    listForAdmin(adminEmail: string, opts?: {
        unreadOnly?: boolean;
        limit?: number;
    }): Promise<{
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
    unreadCount(adminEmail: string): Promise<{
        count: number;
    }>;
    markRead(adminEmail: string, notificationId: string): Promise<{
        ok: boolean;
    }>;
    markAllRead(adminEmail: string): Promise<{
        updated: number;
    }>;
}
