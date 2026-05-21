import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { ModuleRef } from '@nestjs/core';
import type { Queue } from 'bullmq';

/**
 * Closes every BullMQ queue/worker that this Nest app is aware of when SIGTERM
 * arrives. `enableShutdownHooks()` in main.ts wires SIGTERM/SIGINT to the
 * Nest lifecycle which then calls beforeApplicationShutdown on every
 * registered provider.
 */
@Injectable()
export class BullShutdownService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(BullShutdownService.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    // Inject the names of every queue registered with BullModule.registerQueue.
    // `Optional` so this still resolves in tests that don't register any queues.
    @Optional()
    @Inject('BULL_QUEUE_NAMES')
    private readonly queueNames: string[] | null = null,
  ) {}

  async beforeApplicationShutdown(signal?: string): Promise<void> {
    const names = this.queueNames ?? [];
    if (names.length === 0) return;
    this.logger.log(`Closing ${names.length} BullMQ queue(s) on ${signal ?? 'shutdown'}`);
    await Promise.all(
      names.map(async (name) => {
        try {
          const queue = this.moduleRef.get<Queue>(getQueueToken(name), { strict: false });
          await queue.close();
        } catch (err) {
          this.logger.warn(
            `Failed to close queue ${name}: ${(err as Error)?.message ?? 'unknown'}`,
          );
        }
      }),
    );
  }
}
