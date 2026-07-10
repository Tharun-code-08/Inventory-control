import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EVENT_RELAY_QUEUE } from './event-platform.constants';
import { EventRelayService } from './event-relay.service';

/**
 * Drives EventRelayService.tick on the repeatable relay job. Kept thin: all
 * durability logic (claim / publish / retry / DEAD) lives in the service so it
 * is unit-testable without a queue.
 */
@Processor(EVENT_RELAY_QUEUE)
export class EventRelayProcessor extends WorkerHost {
  private readonly logger = new Logger(EventRelayProcessor.name);

  constructor(private readonly relay: EventRelayService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const result = await this.relay.tick();
    if (result.claimed > 0) {
      this.logger.debug(
        `Relay tick: claimed=${result.claimed} published=${result.published} failed=${result.failed} dead=${result.dead}`,
      );
    }
  }
}
