import { Module, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../event-platform/event-bus';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { WorkflowEngineConsumer } from './workflow-engine.consumer';
import { WorkflowDecisionLogService } from './workflow-decision-log.service';

/**
 * Workflow & Automation Engine (Phase 1). Registers the notification-engine
 * consumer on the (global) EventBus at startup so every domain event that names
 * `notification-engine` in EVENT_REGISTRY is consumed here.
 *
 * Imports NotificationsModule for NotificationService (in-app writes). EventBus
 * and PrismaService come from their @Global modules.
 */
@Module({
  imports: [NotificationsModule],
  providers: [WorkflowEngineConsumer, WorkflowDecisionLogService],
  exports: [WorkflowEngineConsumer],
})
export class WorkflowEngineModule implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly consumer: WorkflowEngineConsumer,
  ) {}

  onModuleInit(): void {
    this.bus.register(this.consumer);
  }
}
