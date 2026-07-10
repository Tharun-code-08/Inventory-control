import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class LoginRateLimitGuard implements CanActivate {
    private readonly MAX_FAILED_ATTEMPTS;
    private readonly LOCK_DURATION_MS;
    private readonly RESET_AFTER_MS;
    private attempts;
    canActivate(context: ExecutionContext): boolean;
    recordFailedAttempt(email: string): void;
    recordSuccessfulAttempt(email: string): void;
    getRemainingLockTime(email: string): number;
    private cleanupOldEntries;
}
