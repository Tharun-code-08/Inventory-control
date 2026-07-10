import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  EVENT_RELAY_INTERVAL_MS,
  EVENT_RELAY_JOB_ID,
  EVENT_RELAY_QUEUE,
} from './event-platform.constants';

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
    await this.queue.add(
      EVENT_RELAY_JOB_ID,
      {},
      {
        repeat: { every: EVENT_RELAY_INTERVAL_MS },
        jobId: EVENT_RELAY_JOB_ID,
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Scheduled outbox relay tick every ${EVENT_RELAY_INTERVAL_MS}ms`);
  }
}
