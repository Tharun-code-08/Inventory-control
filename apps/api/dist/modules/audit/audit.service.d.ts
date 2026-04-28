import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(params: {
        userId: string;
        action: AuditAction;
        entityType: string;
        entityId: string;
        oldValues?: Prisma.InputJsonValue;
        newValues?: Prisma.InputJsonValue;
        ipAddress?: string | null;
        userAgent?: string | null;
    }): Promise<void>;
}
