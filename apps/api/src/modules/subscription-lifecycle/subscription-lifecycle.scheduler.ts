import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SUBSCRIPTION_LIFECYCLE_QUEUE } from './subscription-lifecycle.constants';

@Injectable()
export class SubscriptionLifecycleScheduler {
  private readonly logger = new Logger(SubscriptionLifecycleScheduler.name);

  constructor(@InjectQueue(SUBSCRIPTION_LIFECYCLE_QUEUE) private readonly queue: Queue) {}

  async registerRepeatableJob() {
    await this.queue.add(
      'daily-subscription-lifecycle',
      {},
      {
        repeat: { pattern: '0 9 * * *' },
        jobId: 'daily-subscription-lifecycle',
        removeOnComplete: 20,
        removeOnFail: 20,
      },
    );
    this.logger.log('Scheduled daily subscription lifecycle job (09:00 UTC)');
  }
}
