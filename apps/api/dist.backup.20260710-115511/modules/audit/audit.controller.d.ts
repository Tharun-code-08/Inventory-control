import { AuditExportRateLimitGuard } from "../../common/guards/audit-export-rate-limit.guard";
import type { RequestUser } from "../../common/types/request-user";
import { AuditService } from './audit.service';
import { AuditFilterDto, AuditListQueryDto, PaginationDto, AuditLogResponseDto, AuditListResponseDto } from './dto';
export declare class AuditController {
    private readonly auditService;
    private readonly exportRateLimitGuard;
    private readonly logger;
    constructor(auditService: AuditService, exportRateLimitGuard: AuditExportRateLimitGuard);
    listAuditLogs(user: RequestUser, query: AuditListQueryDto): Promise<AuditListResponseDto>;
    getAuditLog(user: RequestUser, auditLogId: string): Promise<AuditLogResponseDto>;
    getAuditLogsByUser(user: RequestUser, targetUserId: string, pagination: PaginationDto): Promise<AuditListResponseDto>;
    getAuditLogsByEntity(user: RequestUser, entityType: string, entityId: string): Promise<AuditLogResponseDto[]>;
    exportAuditLogsCsv(user: RequestUser, filters: AuditFilterDto): Promise<string>;
}
