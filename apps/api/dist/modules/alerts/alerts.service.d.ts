import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
export declare class AlertsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private configKey;
    list(user: RequestUser): Promise<{
        shopId: string | null;
        title: string;
        id: string;
        severity: string;
        alertType: import(".prisma/client").$Enums.AlertType;
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
        severity: string;
        alertType: import(".prisma/client").$Enums.AlertType;
        message: string;
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
}
