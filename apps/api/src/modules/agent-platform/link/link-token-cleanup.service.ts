import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LinkService } from './link.service';

const EXPIRE_SWEEP_MS = 10 * 60_000;
const PURGE_SWEEP_MS = 24 * 3_600_000;

/**
 * Keeps the link-token table honest: ACTIVE rows past their expiry flip to
 * EXPIRED every 10 minutes (so status reflects reality, not just redemption
 * checks), and consumed/expired rows older than 30 days are purged daily.
 * Plain timers (unref'd) — this codebase has no @nestjs/schedule, and a BullMQ
 * repeatable would be overkill for two idempotent UPDATE/DELETE sweeps.
 */
@Injectable()
export class LinkTokenCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LinkTokenCleanupService.name);
  private expireTimer?: NodeJS.Timeout;
  private purgeTimer?: NodeJS.Timeout;

  constructor(private readonly links: LinkService) {}

  onModuleInit() {
    this.expireTimer = setInterval(() => void this.sweepExpired(), EXPIRE_SWEEP_MS);
    this.purgeTimer = setInterval(() => void this.sweepPurge(), PURGE_SWEEP_MS);
    this.expireTimer.unref();
    this.purgeTimer.unref();
  }

  onModuleDestroy() {
    if (this.expireTimer) clearInterval(this.expireTimer);
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  private async sweepExpired() {
    try {
      const count = await this.links.expireStaleTokens();
      if (count > 0) this.logger.log(`Expired ${count} stale link token(s)`);
    } catch (err) {
      this.logger.warn(`Token expiry sweep failed: ${(err as Error).message}`);
    }
  }

  private async sweepPurge() {
    try {
      const count = await this.links.purgeOldTokens();
      if (count > 0) this.logger.log(`Purged ${count} old link token(s)`);
    } catch (err) {
      this.logger.warn(`Token purge sweep failed: ${(err as Error).message}`);
    }
  }
}
