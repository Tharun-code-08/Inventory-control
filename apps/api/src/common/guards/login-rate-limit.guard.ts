import { Injectable, BadRequestException, Inject, Optional } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.provider';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_S = 15 * 60; // 15 minutes
const WINDOW_S = 30 * 60;        // 30-minute rolling window

// Atomically INCR the counter and set TTL on first write.
// KEYS[1]=countKey, ARGV[1]=windowSeconds
const INCR_WITH_TTL_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

/**
 * Login lockout backed by Redis so it survives restarts and deploys.
 * Falls back to a simple pass-through if Redis is unavailable (no DI binding).
 * Call assertNotLocked() before checking credentials, recordFailedAttempt() on
 * bad password, and recordSuccessfulAttempt() on success.
 */
@Injectable()
export class LoginLockoutService {
  constructor(@Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  async assertNotLocked(email: string): Promise<void> {
    if (!this.redis) return;
    const lockKey = `login:lock:${email.toLowerCase()}`;
    const locked = await this.redis.get(lockKey);
    if (locked) {
      const ttl = await this.redis.ttl(lockKey);
      const minutes = Math.ceil(ttl / 60);
      throw new BadRequestException(
        `Too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      );
    }
  }

  async recordFailedAttempt(email: string): Promise<void> {
    if (!this.redis) return;
    const key = email.toLowerCase();
    const countKey = `login:attempts:${key}`;
    const lockKey = `login:lock:${key}`;

    // Lua script keeps INCR + EXPIRE atomic: no orphaned key if the process dies.
    const count = await this.redis.eval(INCR_WITH_TTL_SCRIPT, 1, countKey, String(WINDOW_S)) as number;
    if (count >= MAX_FAILED_ATTEMPTS) {
      await this.redis.set(lockKey, '1', 'EX', LOCK_DURATION_S);
      await this.redis.del(countKey);
    }
  }

  async recordSuccessfulAttempt(email: string): Promise<void> {
    if (!this.redis) return;
    const key = email.toLowerCase();
    await this.redis.del(`login:attempts:${key}`, `login:lock:${key}`);
  }

  async getRemainingLockTime(email: string): Promise<number> {
    if (!this.redis) return 0;
    const ttl = await this.redis.ttl(`login:lock:${email.toLowerCase()}`);
    return ttl > 0 ? ttl * 1000 : 0;
  }
}
