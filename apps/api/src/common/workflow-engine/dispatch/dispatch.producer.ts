import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BATCH_WINDOW_MS, DISPATCH_JOB, NOTIFICATION_DISPATCH_QUEUE } from './dispatch.constants';
import { DispatchJobData } from './dispatch-job';

/**
 * Producer for the dispatch queue (Plan §11). Two jobs:
 *  - a **deferred** single send, delayed until its quiet-hours window opens;
 *  - a per-customer **batch flush**, delayed by the batch window. A stable
 *    jobId coalesces repeated flush requests within the window into one job, so
 *    N low-priority sends to a customer produce exactly one digest.
 */
@Injectable()
export class DispatchProducer {
  constructor(@InjectQueue(NOTIFICATION_DISPATCH_QUEUE) private readonly queue: Queue) {}

  async enqueueDeferred(job: DispatchJobData, deferUntil: Date): Promise<void> {
    const delay = Math.max(0, deferUntil.getTime() - Date.now());
    await this.queue.add(DISPATCH_JOB.DEFERRED_SEND, job, {
      delay,
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }

  /** Schedule (or coalesce onto) a customer's batch flush. */
  async scheduleFlush(companyId: string, customerId: string): Promise<void> {
    await this.queue.add(
      DISPATCH_JOB.FLUSH_BATCH,
      { companyId, customerId },
      {
        // Same jobId within the window ⇒ the queue keeps the first, so repeated
        // adds don't create duplicate flushes.
        jobId: `flush:${companyId}:${customerId}`,
        delay: BATCH_WINDOW_MS,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }
}
