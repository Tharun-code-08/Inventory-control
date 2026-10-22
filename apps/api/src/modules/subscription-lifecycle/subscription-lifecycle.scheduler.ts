import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SUBSCRIPTION_LIFECYCLE_QUEUE } from './subscription-lifecycle.constants';
import { removeStaleJobSchedulers } from '../../common/queue/job-schedulers';

@Injectable()
export class SubscriptionLifecycleScheduler {
  private readonly logger = new Logger(SubscriptionLifecycleScheduler.name);

  constructor(@InjectQueue(SUBSCRIPTION_LIFECYCLE_QUEUE) private readonly queue: Queue) {}

  async registerRepeatableJob() {
    await removeStaleJobSchedulers(this.queue, ['daily-subscription-lifecycle']);
    await this.queue.upsertJobScheduler(
      'daily-subscription-lifecycle',
      { pattern: '0 9 * * *' },
      { name: 'daily-subscription-lifecycle', data: {}, opts: { removeOnComplete: 20, removeOnFail: 20 } },
    );
    this.logger.log('Scheduled daily subscription lifecycle job (09:00 UTC)');
  }
}
