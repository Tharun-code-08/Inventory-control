import { Injectable, BadRequestException, CanActivate, ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '../types/request-user';

interface UserExportQuota {
  requestCount: number;
  windowStartTime: number;
}

@Injectable()
export class AuditExportRateLimitGuard implements CanActivate {
  private readonly REQUESTS_PER_HOUR = 100;
  private readonly WINDOW_DURATION_MS = 60 * 60 * 1000; // 1 hour
  private userQuotas = new Map<string, UserExportQuota>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user?.id) {
      return true; // Not authenticated, let other guards handle it
    }

    const now = Date.now();
    const quota = this.userQuotas.get(user.id);

    // Initialize or reset quota if window has passed
    if (!quota || now - quota.windowStartTime >= this.WINDOW_DURATION_MS) {
      this.userQuotas.set(user.id, {
        requestCount: 1,
        windowStartTime: now,
      });
      this.cleanupOldEntries(now);
      return true;
    }

    // Check if user has exceeded limit
    if (quota.requestCount >= this.REQUESTS_PER_HOUR) {
      const remainingMs = this.WINDOW_DURATION_MS - (now - quota.windowStartTime);
      const remainingMinutes = Math.ceil(remainingMs / 60_000);

      throw new BadRequestException(
        `Audit export limit exceeded. Maximum ${this.REQUESTS_PER_HOUR} exports per hour. ` +
        `Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`,
      );
    }

    // Increment request count
    quota.requestCount++;
    return true;
  }

  /**
   * Cleanup old entries to prevent unbounded memory growth.
   */
  private cleanupOldEntries(now: number): void {
    const threshold = now - this.WINDOW_DURATION_MS - 60_000; // Allow 1 minute buffer
    for (const [userId, quota] of this.userQuotas.entries()) {
      if (quota.windowStartTime < threshold) {
        this.userQuotas.delete(userId);
      }
    }
  }

  /**
   * Get remaining quota for a user.
   */
  getRemaining(userId: string): number {
    const quota = this.userQuotas.get(userId);
    if (!quota) {
      return this.REQUESTS_PER_HOUR;
    }

    const now = Date.now();
    if (now - quota.windowStartTime >= this.WINDOW_DURATION_MS) {
      return this.REQUESTS_PER_HOUR;
    }

    return Math.max(0, this.REQUESTS_PER_HOUR - quota.requestCount);
  }

  /**
   * Get remaining window time in milliseconds.
   */
  getRemainingWindowTime(userId: string): number {
    const quota = this.userQuotas.get(userId);
    if (!quota) {
      return this.WINDOW_DURATION_MS;
    }

    const now = Date.now();
    const elapsed = now - quota.windowStartTime;

    if (elapsed >= this.WINDOW_DURATION_MS) {
      return this.WINDOW_DURATION_MS;
    }

    return this.WINDOW_DURATION_MS - elapsed;
  }
}
