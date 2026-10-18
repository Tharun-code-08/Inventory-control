import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DUNNING_QUEUE } from './dunning.constants';

@Injectable()
export class DunningSweepScheduler {
  private readonly logger = new Logger(DunningSweepScheduler.name);

  constructor(@InjectQueue(DUNNING_QUEUE) private readonly queue: Queue) {}

  /** Registered on bootstrap only when DUNNING_ENABLED === 'true'. */
  async registerRepeatableJob(): Promise<void> {
    await this.queue.add(
      'daily-dunning-sweep',
      {},
      {
        repeat: { pattern: '0 9 * * *' }, // 09:00 UTC daily
        jobId: 'daily-dunning-sweep',
        removeOnComplete: 20,
        removeOnFail: 20,
      },
    );
    this.logger.log('Scheduled daily dunning sweep (09:00 UTC)');
  }
}
