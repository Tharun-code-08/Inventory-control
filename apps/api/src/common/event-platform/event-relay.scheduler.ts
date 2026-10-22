import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  EVENT_RELAY_INTERVAL_MS,
  EVENT_RELAY_JOB_ID,
  EVENT_RELAY_QUEUE,
} from './event-platform.constants';
import { removeStaleJobSchedulers } from '../queue/job-schedulers';

/**
 * Registers the repeatable relay tick job. Matches this codebase's scheduling
 * convention (BullMQ repeatable jobs registered on module init), since
 * @nestjs/schedule is not a dependency here.
 */
@Injectable()
export class EventRelayScheduler {
  private readonly logger = new Logger(EventRelayScheduler.name);

  constructor(@InjectQueue(EVENT_RELAY_QUEUE) private readonly queue: Queue) {}

  async registerRepeatableJob(): Promise<void> {
    await removeStaleJobSchedulers(this.queue, [EVENT_RELAY_JOB_ID]);
    await this.queue.upsertJobScheduler(
      EVENT_RELAY_JOB_ID,
      { every: EVENT_RELAY_INTERVAL_MS },
      { name: EVENT_RELAY_JOB_ID, data: {}, opts: { removeOnComplete: 50, removeOnFail: 50 } },
    );
    this.logger.log(`Scheduled outbox relay tick every ${EVENT_RELAY_INTERVAL_MS}ms`);
  }
}
