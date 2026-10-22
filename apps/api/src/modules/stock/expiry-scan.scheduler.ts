import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { EXPIRY_SCAN_QUEUE, EXPIRY_SCAN_JOB_ID, EXPIRY_SCAN_CRON_DEFAULT } from './expiry-scan.constants';
import { removeStaleJobSchedulers } from '../../common/queue/job-schedulers';

@Injectable()
export class ExpiryScanScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExpiryScanScheduler.name);

  constructor(
    @InjectQueue(EXPIRY_SCAN_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Env values are strings: 'false' or '0' must disable the scan.
    const enabled = ['true', '1'].includes(String(this.config.get('EXPIRY_SCAN_ENABLED') ?? '').trim().toLowerCase());
    if (!enabled) {
      this.logger.log('Expiry scan disabled via EXPIRY_SCAN_ENABLED');
      // Drop a schedule registered while it was enabled.
      await removeStaleJobSchedulers(this.queue, []).catch(() => undefined);
      return;
    }

    try {
      const cron = this.config.get<string>('EXPIRY_SCAN_CRON', EXPIRY_SCAN_CRON_DEFAULT);
      await removeStaleJobSchedulers(this.queue, [EXPIRY_SCAN_JOB_ID]);
      await this.queue.upsertJobScheduler(
        EXPIRY_SCAN_JOB_ID,
        { pattern: cron },
        { name: EXPIRY_SCAN_JOB_ID, data: {}, opts: { removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 } } },
      );
      this.logger.log(`Expiry scan scheduled with cron: ${cron}`);
    } catch (err) {
      this.logger.error(`Failed to register expiry scan job: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
