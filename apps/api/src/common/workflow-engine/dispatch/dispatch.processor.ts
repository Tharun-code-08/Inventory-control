import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DISPATCH_JOB, NOTIFICATION_DISPATCH_QUEUE } from './dispatch.constants';
import { DispatchJobData } from './dispatch-job';
import { DispatchBatchService } from './dispatch-batch.service';
import { CustomerDispatchService } from './customer-dispatch.service';

/**
 * Worker for the dispatch queue (Plan §11). Performs deferred sends when their
 * quiet-hours window opens, and flushes a customer's accumulated low-priority
 * sends as a single digest.
 */
@Processor(NOTIFICATION_DISPATCH_QUEUE)
export class DispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(
    private readonly dispatch: CustomerDispatchService,
    private readonly batch: DispatchBatchService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === DISPATCH_JOB.DEFERRED_SEND) {
      await this.dispatch.sendDeferred(job.data as DispatchJobData);
      return;
    }
    if (job.name === DISPATCH_JOB.FLUSH_BATCH) {
      const { companyId, customerId } = job.data as { companyId: string; customerId: string };
      const items = await this.batch.collectPending(companyId, customerId);
      if (items.length > 0) await this.dispatch.sendDigest(companyId, customerId, items);
      return;
    }
    this.logger.warn(`Unknown dispatch job "${job.name}" ignored.`);
  }
}
