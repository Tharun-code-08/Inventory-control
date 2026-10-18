import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Distributed locking (Plan §10 "Distributed Locking"). Prevents two workers
 * from processing the same entity (e.g. the same FollowupThread) at once.
 *
 * Uses PostgreSQL session-level advisory locks — no extra infra (Redis/Zookeeper)
 * and no lock table to garbage-collect. A string key is hashed to the
 * (classId, objId) int pair `pg_try_advisory_lock` expects; `classId` namespaces
 * workflow-engine locks away from any other advisory-lock user.
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  /** Namespace for every workflow-engine advisory lock. */
  private static readonly CLASS_ID = 0x776b666c; // "wkfl"

  constructor(private readonly prisma: PrismaService) {}

  /** Deterministic signed 32-bit hash of a lock key. */
  private objId(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    }
    return h;
  }

  async tryAcquire(key: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${DistributedLockService.CLASS_ID}::int, ${this.objId(key)}::int) AS locked
    `;
    return rows[0]?.locked === true;
  }

  async release(key: string): Promise<void> {
    await this.prisma.$queryRaw`
      SELECT pg_advisory_unlock(${DistributedLockService.CLASS_ID}::int, ${this.objId(key)}::int)
    `;
  }

  /**
   * Run `fn` while holding the lock; skips (returns null) if another worker holds
   * it. Always releases, even on error.
   */
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    const acquired = await this.tryAcquire(key);
    if (!acquired) {
      this.logger.debug(`Lock "${key}" busy; skipping.`);
      return null;
    }
    try {
      return await fn();
    } finally {
      await this.release(key).catch((err) =>
        this.logger.warn(`Failed to release lock "${key}": ${(err as Error).message}`),
      );
    }
  }
}
