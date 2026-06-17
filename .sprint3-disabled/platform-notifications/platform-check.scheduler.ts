import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PLATFORM_CHECKS_QUEUE } from './platform-notification.constants';

@Injectable()
export class PlatformCheckScheduler {
  private readonly logger = new Logger(PlatformCheckScheduler.name);

  constructor(@InjectQueue(PLATFORM_CHECKS_QUEUE) private readonly queue: Queue) {}

  async registerRepeatableJobs() {
    await this.queue.add(
      'health-check',
      { kind: 'health-check' },
      {
        repeat: { pattern: '*/5 * * * *' },
        jobId: 'platform-health-check',
        removeOnComplete: 20,
        removeOnFail: 20,
      },
    );

    await this.queue.add(
      'revenue-milestones',
      { kind: 'revenue-milestones' },
      {
        repeat: { pattern: '0 6 * * *' },
        jobId: 'platform-revenue-milestones',
        removeOnComplete: 10,
        removeOnFail: 10,
      },
    );

    this.logger.log('Scheduled platform check jobs (health every 5m, revenue milestones daily)');
  }
}
