import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DistributedLockService } from './distributed-lock.service';
import { classifyStalled, DEFAULT_STALL_THRESHOLDS, StallThresholds } from './dead-workflow';

export interface RecoverySummary {
  readonly scanned: number;
  readonly retried: number;
  readonly escalated: number;
}

/**
 * Dead-workflow recovery (Plan §10). Periodically scans ACTIVE followup threads
 * whose next action is far past due and either re-arms them (retry) or escalates
 * them. Runs under a distributed lock so only one worker sweeps at a time.
 *
 * This is invoked by the dunning scheduler's sweep (or an admin endpoint); it is
 * safe to call repeatedly and is a no-op when nothing has stalled.
 */
@Injectable()
export class DeadWorkflowRecoveryService {
  private readonly logger = new Logger(DeadWorkflowRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lock: DistributedLockService,
  ) {}

  async recover(now: Date = new Date(), thresholds: StallThresholds = DEFAULT_STALL_THRESHOLDS): Promise<RecoverySummary> {
    const result = await this.lock.withLock('dead-workflow-recovery', () => this.sweep(now, thresholds));
    return result ?? { scanned: 0, retried: 0, escalated: 0 };
  }

  private async sweep(now: Date, thresholds: StallThresholds): Promise<RecoverySummary> {
    const cutoff = new Date(now.getTime() - thresholds.retryAfterMs);
    const candidates = await this.prisma.followupThread.findMany({
      where: { state: 'ACTIVE', nextActionAt: { lt: cutoff } },
      take: 500,
    });

    let retried = 0;
    let escalated = 0;
    for (const thread of candidates) {
      const verdict = classifyStalled(
        { state: thread.state, nextActionAt: thread.nextActionAt, updatedAt: thread.updatedAt },
        now,
        thresholds,
      );
      if (verdict === 'retry') {
        // Re-arm: nudge nextActionAt to now so the next sweep picks it up cleanly.
        await this.prisma.followupThread.update({
          where: { id: thread.id },
          data: { nextActionAt: now },
        });
        retried += 1;
      } else if (verdict === 'escalate') {
        await this.prisma.followupThread.update({
          where: { id: thread.id },
          data: { state: 'ESCALATED', stopReason: 'auto-recovery: stalled beyond escalation threshold' },
        });
        escalated += 1;
      }
    }

    if (retried || escalated) {
      this.logger.warn(`Dead-workflow recovery: ${retried} retried, ${escalated} escalated of ${candidates.length} scanned.`);
    }
    return { scanned: candidates.length, retried, escalated };
  }
}
