import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DispatchJobData } from './dispatch-job';

export interface BatchItem {
  readonly id?: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly balanceDue: number;
  readonly tone: string;
  readonly eventId: string;
  readonly correlationId: string;
}

/** A SENDING claim older than this is treated as abandoned (worker crash). */
const STALE_CLAIM_MS = 15 * 60_000;

/**
 * Persistence for digest batching (Plan Phase 3). Low-priority sends accumulate
 * as PENDING rows. A flush claims them as SENDING under a per-customer lock (so
 * a concurrent flush can't double-send), and they become SENT only after the
 * digest went out; a failed send releases them back to PENDING.
 */
@Injectable()
export class DispatchBatchService {
  constructor(private readonly prisma: PrismaService) {}

  async add(job: DispatchJobData): Promise<void> {
    // Idempotent per event: a retried dunning step must not batch twice.
    const existing = await this.prisma.dispatchBatchItem.findFirst({
      where: { eventId: job.eventId, customerId: job.customerId, invoiceId: job.invoiceId },
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.dispatchBatchItem.create({
      data: {
        companyId: job.companyId,
        customerId: job.customerId,
        invoiceId: job.invoiceId,
        invoiceNumber: job.invoiceNumber,
        balanceDue: job.balanceDue,
        tone: job.tone,
        eventId: job.eventId,
        correlationId: job.correlationId,
        status: 'PENDING',
      },
    });
  }

  /** Claim a customer's PENDING (or abandoned SENDING) items and return them. */
  async collectPending(companyId: string, customerId: string): Promise<BatchItem[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`digest:${companyId}:${customerId}`}::text))`;
      const now = new Date();
      const rows = await tx.dispatchBatchItem.findMany({
        where: {
          companyId,
          customerId,
          OR: [
            { status: 'PENDING' },
            { status: 'SENDING', claimedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });
      if (rows.length === 0) return [];
      await tx.dispatchBatchItem.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { status: 'SENDING', claimedAt: now },
      });
      return rows.map((r) => ({
        id: r.id,
        invoiceId: r.invoiceId,
        invoiceNumber: r.invoiceNumber,
        balanceDue: r.balanceDue,
        tone: r.tone,
        eventId: r.eventId,
        correlationId: r.correlationId,
      }));
    });
  }

  /** The digest went out: the claimed items are done. */
  async markSent(items: readonly BatchItem[]): Promise<void> {
    const ids = items.map((i) => i.id).filter((id): id is string => !!id);
    if (ids.length === 0) return;
    await this.prisma.dispatchBatchItem.updateMany({
      where: { id: { in: ids }, status: 'SENDING' },
      data: { status: 'SENT' },
    });
  }

  /** The digest failed: hand the claimed items back for the retry. */
  async release(items: readonly BatchItem[]): Promise<void> {
    const ids = items.map((i) => i.id).filter((id): id is string => !!id);
    if (ids.length === 0) return;
    await this.prisma.dispatchBatchItem.updateMany({
      where: { id: { in: ids }, status: 'SENDING' },
      data: { status: 'PENDING', claimedAt: null },
    });
  }
}
