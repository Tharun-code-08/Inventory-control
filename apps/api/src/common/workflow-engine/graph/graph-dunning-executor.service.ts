import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxService } from '../../event-platform/outbox.service';
import { FeatureFlagsService } from '../ops/feature-flags.service';
import { ConditionRegistry } from '../plugins/condition-registry';
import { WorkflowRegistryService } from './workflow-registry.service';
import { advanceThread, ThreadFacts } from './workflow-thread-runner';
import { graphActionToStepPayload, graphEscalateToStepPayload, StepContext } from './graph-step-payload';

const DUNNING_ENTITY_TYPE = 'invoice';
const WORKFLOW_KEY = 'invoice-dunning';
const DAY_MS = 86_400_000;

export interface GraphSweepResult {
  readonly companiesEnabled: number;
  readonly threadsAdvanced: number;
  readonly stepsEmitted: number;
  readonly resolved: number;
}

/**
 * Graph-driven dunning execution (Plan §6 — the keystone). The alternative to
 * the ladder sweep: instead of `DUNNING_LADDER[index]`, each active
 * FollowupThread is advanced through its pinned {@link WorkflowVersion} by
 * {@link advanceThread}, storing the parked node on `currentNodeId`. Every
 * ACTION emits the same `invoice.dunning-step` event the ladder does, so the
 * whole downstream dispatch pipeline is reused unchanged.
 *
 * Opt-in per tenant via the `graph-execution` feature flag (default off) so the
 * proven ladder sweep stays authoritative until a company chooses the graph.
 * Both must never run for the same tenant at once — see docs; enabling
 * graph-execution is the switch that hands a tenant over to the graph.
 */
@Injectable()
export class GraphDunningExecutor {
  private readonly logger = new Logger(GraphDunningExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly registry: WorkflowRegistryService,
    private readonly features: FeatureFlagsService,
    private readonly conditions: ConditionRegistry,
  ) {}

  async sweep(now: Date = new Date()): Promise<GraphSweepResult> {
    const due = await this.prisma.followupThread.findMany({
      where: {
        entityType: DUNNING_ENTITY_TYPE,
        state: 'ACTIVE',
        OR: [{ nextActionAt: null }, { nextActionAt: { lte: now } }],
      },
      take: 500,
    });

    // Resolve each distinct company's flag once.
    const flagByCompany = new Map<string, boolean>();
    for (const companyId of new Set(due.map((t) => t.companyId))) {
      flagByCompany.set(companyId, await this.features.isEnabled(companyId, 'graph-execution'));
    }
    const companiesEnabled = [...flagByCompany.values()].filter(Boolean).length;

    let threadsAdvanced = 0;
    let stepsEmitted = 0;
    let resolved = 0;

    for (const thread of due) {
      if (!flagByCompany.get(thread.companyId)) continue;

      const facts = await this.loadFacts(thread.entityId);
      if (!facts) continue; // invoice gone / not collectible → leave thread as-is
      const published = await this.registry.getPublished(thread.companyId, WORKFLOW_KEY);
      if (!published) continue;

      const advance = advanceThread(published.workflow, thread.currentNodeId ?? null, facts.threadFacts, now, {
        // Route CONDITION nodes through the pluggable registry so custom
        // conditions (officeHours, amount.gt, approvalReceived…) work live.
        evaluate: (spec, f, at) =>
          this.conditions.evaluate(spec, {
            invoicePaid: f.invoicePaid,
            customerReplied: f.customerReplied,
            now: at,
            amount: f.amount,
            daysOverdue: f.daysOverdue,
            flags: f.flags,
          }),
      });
      const ctx: StepContext = {
        invoiceId: thread.entityId,
        invoiceNumber: facts.invoiceNumber,
        customerId: thread.customerId,
        balanceDue: facts.balanceDue,
        daysFromDue: facts.daysFromDue,
      };

      await this.prisma.$transaction(async (tx) => {
        for (const effect of advance.effects) {
          const payload =
            effect.kind === 'ACTION' ? graphActionToStepPayload(effect.action, ctx) : graphEscalateToStepPayload(ctx);
          await this.outbox.emit(tx, {
            eventType: 'invoice.dunning-step',
            eventVersion: 1,
            aggregateType: 'invoice',
            aggregateId: thread.entityId,
            companyId: thread.companyId,
            payload: payload as unknown as Record<string, unknown>,
          });
          stepsEmitted += 1;
        }
        await tx.followupThread.update({
          where: { id: thread.id },
          data: this.parkToThreadData(advance.park, published.version),
        });
      });

      threadsAdvanced += 1;
      if (advance.park.kind === 'TERMINAL') resolved += 1;
    }

    if (threadsAdvanced > 0) {
      this.logger.log(
        `Graph dunning: ${threadsAdvanced} threads advanced, ${stepsEmitted} steps emitted, ${resolved} resolved ` +
          `(${companiesEnabled} companies on graph-execution).`,
      );
    }
    return { companiesEnabled, threadsAdvanced, stepsEmitted, resolved };
  }

  private parkToThreadData(
    park: ReturnType<typeof advanceThread>['park'],
    version: number,
  ): Prisma.FollowupThreadUpdateInput {
    if (park.kind === 'WAIT') {
      return { currentNodeId: park.nextNodeId, nextActionAt: park.resumeAt, workflowVersion: version, state: 'ACTIVE' };
    }
    // TERMINAL: map the graph reason onto a thread state.
    const state = park.reason === 'paid' ? 'RESOLVED' : park.reason === 'unresolved' ? 'ESCALATED' : 'STOPPED';
    return { currentNodeId: park.nodeKey, nextActionAt: null, state, stopReason: `graph:${park.reason}` };
  }

  /** Load the live invoice facts a thread's conditions are evaluated against. */
  private async loadFacts(invoiceId: string): Promise<
    | { invoiceNumber: string; balanceDue: number; daysFromDue: number; threadFacts: ThreadFacts }
    | null
  > {
    const invoice = await this.prisma.invoiceHeader.findUnique({
      where: { id: invoiceId },
      select: { invoiceNumber: true, status: true, dueDate: true, totalValue: true, paidValue: true },
    });
    if (!invoice) return null;
    const balanceDue = Number(invoice.totalValue) - Number(invoice.paidValue);
    const invoicePaid = invoice.status === InvoiceStatus.PAID || balanceDue <= 0;
    const daysFromDue = invoice.dueDate ? Math.floor((Date.now() - invoice.dueDate.getTime()) / DAY_MS) : 0;
    return {
      invoiceNumber: invoice.invoiceNumber,
      balanceDue,
      daysFromDue,
      // customerReplied is enforced by the lifecycle handler pausing the thread;
      // ACTIVE threads reaching here have no unhandled reply.
      threadFacts: { invoicePaid, customerReplied: false, amount: balanceDue, daysOverdue: daysFromDue },
    };
  }
}
