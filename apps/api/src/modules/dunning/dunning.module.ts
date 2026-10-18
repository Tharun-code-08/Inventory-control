import { BullModule } from '@nestjs/bullmq';
import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkflowEngineModule } from '@/common/workflow-engine/workflow-engine.module';
import { DUNNING_ENABLED_ENV, DUNNING_QUEUE } from './dunning.constants';
import { DunningRepository } from './dunning.repository';
import { DunningSweepService } from './dunning-sweep.service';
import { DunningSweepProcessor } from './dunning-sweep.processor';
import { DunningSweepScheduler } from './dunning-sweep.scheduler';

/**
 * Customer dunning (Phase 2, Task #9 producer). Loads collectible invoices, runs
 * the pure sweep planner, persists FollowupThread state and emits
 * `invoice.dunning-step` events for the Workflow Engine to deliver.
 *
 * Gated by DUNNING_ENABLED: when unset/false the scheduler never registers, so
 * no sweep runs. OutboxService + PrismaService come from their @Global modules.
 */
@Module({
  imports: [BullModule.registerQueue({ name: DUNNING_QUEUE }), WorkflowEngineModule],
  providers: [
    DunningRepository,
    DunningSweepService,
    DunningSweepProcessor,
    DunningSweepScheduler,
  ],
  exports: [DunningSweepService],
})
export class DunningModule implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    private readonly scheduler: DunningSweepScheduler,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>(DUNNING_ENABLED_ENV) === 'true') {
      await this.scheduler.registerRepeatableJob();
    }
  }
}
