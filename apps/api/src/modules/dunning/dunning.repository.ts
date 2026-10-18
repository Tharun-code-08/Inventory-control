import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { InvoiceCollectStatus } from '@/common/workflow-engine/dunning';
import { DunningCandidate, ThreadOp, ThreadState } from '@/common/workflow-engine/dunning-sweep';
import {
  ChannelConsentRecord,
  ConsentChannel,
  ConsentState,
  toDunningConsent,
} from '@/common/workflow-engine/consent';
import { DUNNING_ENTITY_TYPE } from './dunning.constants';

/**
 * Typed data access for the dunning sweep. Reads collectible invoices + their
 * customer consent + existing FollowupThread into the DunningCandidate shape the
 * pure planner consumes, and persists the resulting ThreadOps. All decisions
 * live in the pure core (dunning-sweep.ts); this only moves rows.
 */
@Injectable()
export class DunningRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Collectible invoices (issued / partially paid, with a due date) as candidates. */
  async loadCandidates(): Promise<DunningCandidate[]> {
    const invoices = await this.prisma.invoiceHeader.findMany({
      where: {
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
        dueDate: { not: null },
      },
      select: {
        id: true,
        invoiceNumber: true,
        customerId: true,
        status: true,
        dueDate: true,
        totalValue: true,
        paidValue: true,
        shop: { select: { companyId: true } },
      },
      take: 2000,
    });
    if (invoices.length === 0) return [];

    const invoiceIds = invoices.map((i) => i.id);
    const customerIds = [...new Set(invoices.map((i) => i.customerId))];

    const [threads, channels] = await Promise.all([
      this.prisma.followupThread.findMany({
        where: { entityType: DUNNING_ENTITY_TYPE, entityId: { in: invoiceIds } },
        select: { entityId: true, ladderStep: true, state: true },
      }),
      this.prisma.customerContactChannel.findMany({
        where: { customerId: { in: customerIds } },
        select: { customerId: true, channel: true, consentState: true },
      }),
    ]);

    const threadByInvoice = new Map(threads.map((t) => [t.entityId, t]));
    const consentByCustomer = new Map<string, ChannelConsentRecord[]>();
    for (const c of channels) {
      const list = consentByCustomer.get(c.customerId) ?? [];
      list.push({ channel: c.channel as ConsentChannel, consentState: c.consentState as ConsentState });
      consentByCustomer.set(c.customerId, list);
    }

    return invoices
      .map((i): DunningCandidate | null => {
        const companyId = i.shop?.companyId;
        if (!companyId) return null; // invoice's shop not linked to a company → skip
        const thread = threadByInvoice.get(i.id);
        return {
          invoiceId: i.id,
          invoiceNumber: i.invoiceNumber,
          companyId,
          customerId: i.customerId,
          dueDate: i.dueDate,
          balanceDue: Number(i.totalValue) - Number(i.paidValue),
          invoiceStatus: i.status as InvoiceCollectStatus,
          // Stop-on-reply is enforced by the lifecycle handler pausing the thread;
          // the sweep then skips PAUSED threads, so per-candidate default is false.
          customerReplied: false,
          consent: toDunningConsent(consentByCustomer.get(i.customerId) ?? []),
          thread: thread ? { ladderStep: thread.ladderStep, state: thread.state as ThreadState } : null,
        };
      })
      .filter((c): c is DunningCandidate => c !== null);
  }

  /** Upsert the thread state produced by the planner. Runs inside the sweep tx. */
  async saveThreadOps(tx: Prisma.TransactionClient, ops: readonly ThreadOp[]): Promise<void> {
    for (const op of ops) {
      await tx.followupThread.upsert({
        where: {
          entityType_entityId: { entityType: DUNNING_ENTITY_TYPE, entityId: op.invoiceId },
        },
        create: {
          companyId: op.companyId,
          entityType: DUNNING_ENTITY_TYPE,
          entityId: op.invoiceId,
          customerId: op.customerId,
          ladderStep: op.ladderStep,
          state: op.state,
          nextActionAt: op.nextActionAt,
          stopReason: op.stopReason ?? null,
        },
        update: {
          ladderStep: op.ladderStep,
          state: op.state,
          nextActionAt: op.nextActionAt,
          stopReason: op.stopReason ?? null,
        },
      });
    }
  }
}
