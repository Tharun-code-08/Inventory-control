import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BullShutdownService } from './bull-shutdown.service';
import { JobFailureService } from './job-failure.service';

/**
 * Names of every BullMQ queue this app registers via `BullModule.registerQueue`.
 * Used by `BullShutdownService` to drain them on SIGTERM/SIGINT, and by tests
 * to assert the registry stays in sync.
 */
export const REGISTERED_QUEUES = ['exports', 'notifications'] as const;

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    JobFailureService,
    BullShutdownService,
    { provide: 'BULL_QUEUE_NAMES', useValue: [...REGISTERED_QUEUES] },
  ],
  exports: [JobFailureService, BullShutdownService],
})
export class QueuesModule {}
