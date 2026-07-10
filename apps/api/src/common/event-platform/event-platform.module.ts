import { BullModule } from '@nestjs/bullmq';
import { Global, Module, OnModuleInit } from '@nestjs/common';
import { EVENT_PLATFORM_MAINTENANCE_QUEUE, EVENT_RELAY_QUEUE } from './event-platform.constants';
import { EventBus } from './event-bus';
import { EventRelayProcessor } from './event-relay.processor';
import { EventRelayScheduler } from './event-relay.scheduler';
import { EventRelayService } from './event-relay.service';
import { OutboxService } from './outbox.service';
import { RetentionProcessor } from './retention.processor';
import { RetentionScheduler } from './retention.scheduler';
import { RetentionService } from './retention.service';

/**
 * Enterprise Event Platform core (Phase 1, Step 1). Global so any business
 * module can inject OutboxService.emit inside its transaction, and so
 * consumers (Notification Engine, Step 2) can register on the EventBus.
 *
 * Relies on PrismaModule being @Global (it is) for PrismaService injection.
 */
@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: EVENT_RELAY_QUEUE }),
    BullModule.registerQueue({ name: EVENT_PLATFORM_MAINTENANCE_QUEUE }),
  ],
  providers: [
    OutboxService,
    EventBus,
    EventRelayService,
    EventRelayProcessor,
    EventRelayScheduler,
    RetentionService,
    RetentionProcessor,
    RetentionScheduler,
  ],
  exports: [OutboxService, EventBus, EventRelayService, RetentionService],
})
export class EventPlatformModule implements OnModuleInit {
  constructor(
    private readonly relayScheduler: EventRelayScheduler,
    private readonly retentionScheduler: RetentionScheduler,
  ) {}

  onModuleInit(): void {
    void this.relayScheduler.registerRepeatableJob();
    void this.retentionScheduler.registerRepeatableJob();
  }
}
