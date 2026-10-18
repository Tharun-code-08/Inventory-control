import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DUNNING_QUEUE } from './dunning.constants';
import { DunningSweepService } from './dunning-sweep.service';

@Processor(DUNNING_QUEUE)
export class DunningSweepProcessor extends WorkerHost {
  private readonly logger = new Logger(DunningSweepProcessor.name);

  constructor(private readonly sweep: DunningSweepService) {
    super();
  }

  async process(_job: Job) {
    void _job;
    return this.sweep.sweep();
  }
}
