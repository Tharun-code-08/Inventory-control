import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
export declare class AlertsService {
    private readonly prisma;
    private readonly notifications;
    private readonly emailNotifications;
    constructor(prisma: PrismaService, notifications?: NotificationsService | null, emailNotifications?: EmailNotificationsService | null);
    private configKey;
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
    getNotificationConfig(user: RequestUser): Promise<Prisma.JsonValue | {
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
    updateNotificationConfig(user: RequestUser, dto: UpdateNotificationConfigDto): Promise<Prisma.JsonValue>;
    runAutomationChecks(): Promise<{
        generated: number;
    }>;
    runRetention(daysToKeep?: number): Promise<{
        daysToKeep: number;
        cutoff: string;
        deleted: number;
    }>;
}
