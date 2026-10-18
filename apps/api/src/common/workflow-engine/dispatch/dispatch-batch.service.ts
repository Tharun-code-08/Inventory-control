import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DispatchJobData } from './dispatch-job';

export interface BatchItem {
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly balanceDue: number;
  readonly tone: string;
  readonly eventId: string;
  readonly correlationId: string;
}

/**
 * Persistence for digest batching (Plan Phase 3). Low-priority sends accumulate
 * as PENDING rows; a flush collects and marks them SENT atomically (so a
 * concurrent flush can't double-send), returning the items to coalesce into one
 * message.
 */
@Injectable()
export class DispatchBatchService {
  constructor(private readonly prisma: PrismaService) {}

  async add(job: DispatchJobData): Promise<void> {
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

  /** Claim all PENDING items for a customer (marks them SENT) and return them. */
  async collectPending(companyId: string, customerId: string): Promise<BatchItem[]> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.dispatchBatchItem.findMany({
        where: { companyId, customerId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      if (rows.length === 0) return [];
      await tx.dispatchBatchItem.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { status: 'SENT' },
      });
      return rows.map((r) => ({
        invoiceId: r.invoiceId,
        invoiceNumber: r.invoiceNumber,
        balanceDue: r.balanceDue,
        tone: r.tone,
        eventId: r.eventId,
        correlationId: r.correlationId,
      }));
    });
  }
}
