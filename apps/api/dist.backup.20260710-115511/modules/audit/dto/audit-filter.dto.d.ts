import { AuditAction } from '@prisma/client';
export declare class AuditFilterDto {
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    ipAddress?: string;
    searchQuery?: string;
}
export declare class PaginationDto {
    page: number;
    limit: number;
    sortBy: 'createdAt' | 'userId' | 'action';
    sortOrder: 'asc' | 'desc';
}
export declare class AuditListQueryDto extends AuditFilterDto {
    page: number;
    limit: number;
    sortBy: 'createdAt' | 'userId' | 'action';
    sortOrder: 'asc' | 'desc';
}
export declare class AuditLogResponseDto {
    id: string;
    companyId: string;
    userId: string;
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    metadata?: Record<string, any>;
    reason?: string;
    severity?: string;
    requestId?: string;
    createdAt: Date;
    user: {
        id: string;
        email: string;
        name?: string;
    };
}
export declare class AuditListResponseDto {
    data: AuditLogResponseDto[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
