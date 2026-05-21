import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Records terminal BullMQ job failures (after all retries exhausted) to a
 * persistent dead-letter table for ops review.
 *
 * Workers should call `record(...)` from their `failed` listener only when
 * `job.attemptsMade >= job.opts.attempts ?? 1`, so transient retries don't
 * pollute the table.
 */
@Injectable()
export class JobFailureService {
  private readonly logger = new Logger(JobFailureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(job: Job, error: Error): Promise<void> {
    const queue = job.queueName;
    const totalAttempts = job.opts?.attempts ?? 1;
    const isTerminal = (job.attemptsMade ?? 0) >= totalAttempts;
    if (!isTerminal) {
      return;
    }

    try {
      const existing = await this.prisma.jobFailure.findFirst({
        where: {
          queue,
          jobId: job.id ? String(job.id) : null,
          errorMsg: error?.message?.slice(0, 2000) ?? null,
          failedAt: { gte: new Date(Date.now() - 60_000) },
        },
        select: { id: true },
      });
      if (existing) {
        return;
      }
      await this.prisma.jobFailure.create({
        data: {
          queue,
          jobName: job.name,
          jobId: job.id ? String(job.id) : null,
          data: this.toJsonSafe(job.data),
          errorName: error?.name?.slice(0, 200) ?? null,
          errorMsg: error?.message?.slice(0, 2000) ?? null,
          stack: error?.stack?.slice(0, 8000) ?? null,
          attempts: job.attemptsMade ?? 0,
        },
      });
    } catch (writeErr) {
      this.logger.error(
        `Failed to persist DLQ row for queue=${queue} job=${job.id}: ${(writeErr as Error)?.message ?? 'unknown'}`,
      );
    }
  }

  private toJsonSafe(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === null || value === undefined) return undefined;
    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
      return undefined;
    }
  }
}
