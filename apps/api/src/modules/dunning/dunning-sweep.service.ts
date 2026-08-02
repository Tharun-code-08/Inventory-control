import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxService } from '@/common/event-platform/outbox.service';
import { planDunningSweep, toDunningStepEvent } from '@/common/workflow-engine/dunning-sweep';
import { FeatureFlagsService } from '@/common/workflow-engine/ops/feature-flags.service';
import { GraphDunningExecutor } from '@/common/workflow-engine/graph/graph-dunning-executor.service';
import { DunningRepository } from './dunning.repository';

export interface DunningSweepResult {
  readonly candidates: number;
  readonly emitted: number;
  readonly threadOps: number;
  readonly blocked: number;
  readonly skipped: number;
  /** Threads advanced via the workflow graph (graph-execution tenants). */
  readonly graphAdvanced: number;
}

/**
 * Orchestrates one dunning sweep. Each tenant runs on exactly one execution
 * model: the pure ladder planner (default) or the workflow graph
 * (`graph-execution` flag). Candidates are partitioned by that flag so a tenant
 * is never processed by both — the plan's "both must never run for the same
 * tenant" invariant.
 *
 * Ladder path: load candidates → plan → persist thread state + emit
 * `invoice.dunning-step` events atomically. Graph path: delegate to
 * {@link GraphDunningExecutor}, which advances each thread through its pinned
 * workflow version and emits the same events. The Workflow Engine consumer
 * delivers every step regardless of which model produced it.
 */
@Injectable()
export class DunningSweepService {
  private readonly logger = new Logger(DunningSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: DunningRepository,
    private readonly outbox: OutboxService,
    private readonly features: FeatureFlagsService,
    private readonly graph: GraphDunningExecutor,
  ) {}

  async sweep(now: Date = new Date()): Promise<DunningSweepResult> {
    const candidates = await this.repo.loadCandidates();

    // Resolve each company's execution model once, then keep only ladder-model
    // candidates for the pure planner. Graph-model tenants are handled by the
    // executor below, so they are never double-processed.
    const graphByCompany = new Map<string, boolean>();
    for (const companyId of new Set(candidates.map((c) => c.companyId))) {
      graphByCompany.set(companyId, await this.features.isEnabled(companyId, 'graph-execution'));
    }
    const ladderCandidates = candidates.filter((c) => !graphByCompany.get(c.companyId));
    const plan = planDunningSweep(ladderCandidates, now);

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

    // Graph-model tenants: advance threads through their workflow version.
    const graphResult = await this.graph.sweep(now);

    const result: DunningSweepResult = {
      candidates: candidates.length,
      emitted: plan.sends.length,
      threadOps: plan.threadOps.length,
      blocked: plan.blocked.length,
      skipped: plan.skipped.length,
      graphAdvanced: graphResult.threadsAdvanced,
    };
    this.logger.log(
      `Dunning sweep: ${result.candidates} candidates → ${result.emitted} ladder steps emitted, ` +
        `${result.threadOps} threads updated, ${result.blocked} blocked, ${result.skipped} skipped, ` +
        `${result.graphAdvanced} graph threads advanced.`,
    );
    return result;
  }
}
