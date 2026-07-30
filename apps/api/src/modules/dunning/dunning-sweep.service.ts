import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxService } from '@/common/event-platform/outbox.service';
import { planDunningSweep, toDunningStepEvent } from '@/common/workflow-engine/dunning-sweep';
import { DunningRepository } from './dunning.repository';

export interface DunningSweepResult {
  readonly candidates: number;
  readonly emitted: number;
  readonly threadOps: number;
  readonly blocked: number;
  readonly skipped: number;
}

/**
 * Orchestrates one dunning sweep: load candidates → run the pure planner →
 * persist thread state and emit `invoice.dunning-step` events, atomically in a
 * single transaction so a thread never advances without its event (and vice
 * versa). The Workflow Engine consumer then delivers each step.
 */
@Injectable()
export class DunningSweepService {
  private readonly logger = new Logger(DunningSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: DunningRepository,
    private readonly outbox: OutboxService,
  ) {}

  async sweep(now: Date = new Date()): Promise<DunningSweepResult> {
    const candidates = await this.repo.loadCandidates();
    const plan = planDunningSweep(candidates, now);

    await this.prisma.$transaction(async (tx) => {
      await this.repo.saveThreadOps(tx, plan.threadOps);
      for (const send of plan.sends) {
        await this.outbox.emit(tx, {
          eventType: 'invoice.dunning-step',
          eventVersion: 1,
          aggregateType: 'invoice',
          aggregateId: send.invoiceId,
          companyId: send.companyId,
          payload: toDunningStepEvent(send),
        });
      }
    });

    const result: DunningSweepResult = {
      candidates: candidates.length,
      emitted: plan.sends.length,
      threadOps: plan.threadOps.length,
      blocked: plan.blocked.length,
      skipped: plan.skipped.length,
    };
    this.logger.log(
      `Dunning sweep: ${result.candidates} candidates → ${result.emitted} steps emitted, ` +
        `${result.threadOps} threads updated, ${result.blocked} blocked, ${result.skipped} skipped.`,
    );
    return result;
  }
}
