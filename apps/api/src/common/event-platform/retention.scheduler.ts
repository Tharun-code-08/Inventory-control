import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  EVENT_PLATFORM_MAINTENANCE_QUEUE,
  RETENTION_CRON,
  RETENTION_JOB,
} from './event-platform.constants';

/** Registers the daily retention-cleanup repeatable job. */
@Injectable()
export class RetentionScheduler {
  private readonly logger = new Logger(RetentionScheduler.name);

  constructor(@InjectQueue(EVENT_PLATFORM_MAINTENANCE_QUEUE) private readonly queue: Queue) {}

  async registerRepeatableJob(): Promise<void> {
    await this.queue.add(
      RETENTION_JOB,
      {},
      {
        repeat: { pattern: RETENTION_CRON },
        jobId: RETENTION_JOB,
        removeOnComplete: 20,
        removeOnFail: 20,
      },
    );
    this.logger.log(`Scheduled retention cleanup (${RETENTION_CRON})`);
  }
}
