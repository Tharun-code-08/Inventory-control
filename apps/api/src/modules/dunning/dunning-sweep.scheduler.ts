import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DUNNING_QUEUE } from './dunning.constants';
import { removeStaleJobSchedulers } from '../../common/queue/job-schedulers';

@Injectable()
export class DunningSweepScheduler {
  private readonly logger = new Logger(DunningSweepScheduler.name);

  constructor(@InjectQueue(DUNNING_QUEUE) private readonly queue: Queue) {}

  /** Registered on bootstrap only when DUNNING_ENABLED === 'true'. */
  async registerRepeatableJob(): Promise<void> {
    await removeStaleJobSchedulers(this.queue, ['daily-dunning-sweep']);
    await this.queue.upsertJobScheduler(
      'daily-dunning-sweep',
      { pattern: '0 9 * * *' }, // 09:00 UTC daily
      { name: 'daily-dunning-sweep', data: {}, opts: { removeOnComplete: 20, removeOnFail: 20 } },
    );
    this.logger.log('Scheduled daily dunning sweep (09:00 UTC)');
  }
}
