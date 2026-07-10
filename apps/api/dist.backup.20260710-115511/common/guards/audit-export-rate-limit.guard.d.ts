import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AuditExportRateLimitGuard implements CanActivate {
    private readonly REQUESTS_PER_HOUR;
    private readonly WINDOW_DURATION_MS;
    private userQuotas;
    canActivate(context: ExecutionContext): boolean;
    private cleanupOldEntries;
    getRemaining(userId: string): number;
    getRemainingWindowTime(userId: string): number;
}
