import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PLATFORM_CHECKS_QUEUE } from './platform-notification.constants';
import { PlatformHealthService } from './platform-health.service';
import { PlatformRevenueService } from './platform-revenue.service';

@Processor(PLATFORM_CHECKS_QUEUE)
export class PlatformCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(PlatformCheckProcessor.name);

  constructor(
    private readonly health: PlatformHealthService,
    private readonly revenue: PlatformRevenueService,
  ) {
    super();
  }

  async process(job: Job<{ kind: string }>) {
    const kind = job.data?.kind ?? job.name;
    if (kind === 'health-check') {
      return this.health.runHealthChecks();
    }
    if (kind === 'revenue-milestones') {
      return this.revenue.checkRevenueMilestones();
    }
    this.logger.warn(`Unknown platform check job: ${kind}`);
    return { skipped: true };
  }
}
