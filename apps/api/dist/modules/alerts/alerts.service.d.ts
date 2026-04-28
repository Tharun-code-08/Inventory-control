import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
export declare class AlertsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    runAutomationChecks(): Promise<{
        generated: number;
    }>;
}
