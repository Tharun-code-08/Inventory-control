import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EVENT_PLATFORM_MAINTENANCE_QUEUE } from './event-platform.constants';
import { RetentionService } from './retention.service';

/** Runs the daily retention cleanup on the maintenance queue. */
@Processor(EVENT_PLATFORM_MAINTENANCE_QUEUE)
export class RetentionProcessor extends WorkerHost {
  constructor(private readonly retention: RetentionService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    await this.retention.cleanup();
  }
}
