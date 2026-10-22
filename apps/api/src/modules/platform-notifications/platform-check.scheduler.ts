import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PLATFORM_CHECKS_QUEUE } from './platform-notification.constants';
import { removeStaleJobSchedulers } from '../../common/queue/job-schedulers';

@Injectable()
export class PlatformCheckScheduler {
  private readonly logger = new Logger(PlatformCheckScheduler.name);

  constructor(@InjectQueue(PLATFORM_CHECKS_QUEUE) private readonly queue: Queue) {}

  async registerRepeatableJobs() {
    await removeStaleJobSchedulers(this.queue, ['platform-health-check', 'platform-revenue-milestones']);
    await this.queue.upsertJobScheduler(
      'platform-health-check',
      { pattern: '*/5 * * * *' },
      { name: 'health-check', data: { kind: 'health-check' }, opts: { removeOnComplete: 20, removeOnFail: 20 } },
    );

    await this.queue.upsertJobScheduler(
      'platform-revenue-milestones',
      { pattern: '0 6 * * *' },
      { name: 'revenue-milestones', data: { kind: 'revenue-milestones' }, opts: { removeOnComplete: 10, removeOnFail: 10 } },
    );

    this.logger.log('Scheduled platform check jobs (health every 5m, revenue milestones daily)');
  }
}
