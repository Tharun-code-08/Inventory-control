import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { EXPIRY_SCAN_QUEUE, EXPIRY_SCAN_JOB_ID, EXPIRY_SCAN_CRON_DEFAULT } from './expiry-scan.constants';

@Injectable()
export class ExpiryScanScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExpiryScanScheduler.name);

  constructor(
    @InjectQueue(EXPIRY_SCAN_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled = this.config.get<boolean>('EXPIRY_SCAN_ENABLED', false);
    if (!enabled) {
      this.logger.log('Expiry scan disabled via EXPIRY_SCAN_ENABLED');
      return;
    }

    try {
      const cron = this.config.get<string>('EXPIRY_SCAN_CRON', EXPIRY_SCAN_CRON_DEFAULT);
      await this.queue.add(
        EXPIRY_SCAN_JOB_ID,
        {},
        {
          repeat: { pattern: cron },
          jobId: EXPIRY_SCAN_JOB_ID,
          removeOnComplete: { age: 3600 },
          removeOnFail: { age: 86400 },
        },
      );
      this.logger.log(`Expiry scan scheduled with cron: ${cron}`);
    } catch (err) {
      this.logger.error(`Failed to register expiry scan job: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
