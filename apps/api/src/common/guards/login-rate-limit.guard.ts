import { Injectable, BadRequestException, CanActivate, ExecutionContext } from '@nestjs/common';

interface LoginAttempt {
  count: number;
  firstAttemptTime: number;
  lockedUntil?: number;
}

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly RESET_AFTER_MS = 30 * 60 * 1000; // Reset counter after 30 minutes without attempts
  private attempts = new Map<string, LoginAttempt>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const body = request.body as { email?: string };

    if (!body?.email) {
      return true; // Let it proceed if no email, error will be caught by service
    }

    const key = body.email.toLowerCase();
    const now = Date.now();

    let attempt = this.attempts.get(key);

    // Check if account is locked
    if (attempt?.lockedUntil && now < attempt.lockedUntil) {
      const remainingMs = attempt.lockedUntil - now;
      const remainingMinutes = Math.ceil(remainingMs / 60_000);
      throw new BadRequestException(
        `Too many failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`,
      );
    }

    // Reset counter if enough time has passed
    if (!attempt || now - attempt.firstAttemptTime > this.RESET_AFTER_MS) {
      attempt = {
        count: 0,
        firstAttemptTime: now,
      };
      this.attempts.set(key, attempt);
    } else {
      // Remove old entries to prevent memory leak
      this.cleanupOldEntries(now);
    }

    return true;
  }

  /**
   * Call this after a failed login attempt to increment the counter
   * and potentially lock the account.
   */
  recordFailedAttempt(email: string): void {
    const key = email.toLowerCase();
    const now = Date.now();

    let attempt = this.attempts.get(key);

    if (!attempt || now - attempt.firstAttemptTime > this.RESET_AFTER_MS) {
      attempt = {
        count: 1,
        firstAttemptTime: now,
      };
    } else {
      attempt.count++;

      // Lock account after max attempts
      if (attempt.count >= this.MAX_FAILED_ATTEMPTS) {
        attempt.lockedUntil = now + this.LOCK_DURATION_MS;
      }
    }

    this.attempts.set(key, attempt);
  }

  /**
   * Call this after a successful login to clear the counter.
   */
  recordSuccessfulAttempt(email: string): void {
    const key = email.toLowerCase();
    this.attempts.delete(key);
  }

  /**
   * Get remaining lock time in milliseconds, or 0 if not locked.
   */
  getRemainingLockTime(email: string): number {
    const key = email.toLowerCase();
    const attempt = this.attempts.get(key);

    if (!attempt?.lockedUntil) {
      return 0;
    }

    const remaining = attempt.lockedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Cleanup old entries to prevent unbounded memory growth.
   */
  private cleanupOldEntries(now: number): void {
    const threshold = now - this.RESET_AFTER_MS - 60_000; // Allow 1 minute buffer
    for (const [key, attempt] of this.attempts.entries()) {
      if (attempt.firstAttemptTime < threshold) {
        this.attempts.delete(key);
      }
    }
  }
}
