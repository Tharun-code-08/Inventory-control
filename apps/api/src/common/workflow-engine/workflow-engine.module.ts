import { BullModule } from '@nestjs/bullmq';
import { Logger, Module, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../event-platform/event-bus';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { WorkflowEngineConsumer } from './workflow-engine.consumer';
import { WorkflowDecisionLogService } from './workflow-decision-log.service';
import { WorkflowRegistryService } from './graph/workflow-registry.service';
import { GraphDunningExecutor } from './graph/graph-dunning-executor.service';
import { ConditionRegistry } from './plugins/condition-registry';
import { ActionRegistry } from './plugins/action-registry';
import { PolicyService } from './policy/policy.service';
import { AiAdvisorService } from './ai/ai-advisor.service';
import { SimulationService } from './ops/simulation.service';
import { EventReplayService } from './ops/event-replay.service';
import { FeatureFlagsService } from './ops/feature-flags.service';
import { DistributedLockService } from './ops/distributed-lock.service';
import { DeadWorkflowRecoveryService } from './ops/dead-workflow-recovery.service';
import { TimelineService } from './analytics/timeline.service';
import { AnalyticsService } from './analytics/analytics.service';
import { PredictiveService } from './predictive/predictive.service';
import { OptimizerService } from './optimizer/optimizer.service';
import { AssistantService } from './assistant/assistant.service';
import { CustomerDispatchService } from './dispatch/customer-dispatch.service';
import { DedupStore } from './dispatch/dedup-store';
import { DeliveryStatusService } from './dispatch/delivery-status.service';
import { DispatchProducer } from './dispatch/dispatch.producer';
import { DispatchProcessor } from './dispatch/dispatch.processor';
import { DispatchBatchService } from './dispatch/dispatch-batch.service';
import { NOTIFICATION_DISPATCH_QUEUE } from './dispatch/dispatch.constants';
import { CUSTOMER_MESSAGE_SENDER } from './dispatch/customer-message-sender';
import { WhatsAppCustomerSender } from './dispatch/whatsapp-customer-sender';
import { EmailCustomerSender } from './dispatch/email-customer-sender';
import { CompositeCustomerSender } from './dispatch/composite-customer-sender';
import { WhatsAppAdapter } from '@/modules/agent-platform/channels/whatsapp/whatsapp.adapter';
import { EmailSendersModule } from '@/modules/email-senders/email-senders.module';
import { CommonPdfModule } from '@/common/pdf/common-pdf.module';
import { CacheModule } from '@/common/cache/cache.module';
import { WorkflowEngineController } from './workflow-engine.controller';
import { DispatchWebhookController } from './dispatch-webhook.controller';

/**
 * Workflow & Automation Engine (Plan §3–§12). Registers:
 *  - the notification-engine consumer on the EventBus (Phase 1),
 *  - the versioned workflow-graph registry + compiler/runtime (§6),
 *  - policy engine (§7), channel routing (§8), AI advisor (§8, advisory-only),
 *  - operational tooling — simulation, event replay, feature flags, distributed
 *    locking, dead-workflow recovery (§10),
 *  - timeline + analytics (§12) behind the WorkflowEngineController.
 *
 * On bootstrap it seeds the system default workflow graphs (e.g. invoice-dunning)
 * without ever clobbering a published version.
 */
@Module({
  imports: [
    NotificationsModule,
    EmailSendersModule,
    CommonPdfModule,
    CacheModule,
    BullModule.registerQueue({ name: NOTIFICATION_DISPATCH_QUEUE }),
  ],
  controllers: [WorkflowEngineController, DispatchWebhookController],
  providers: [
    WorkflowEngineConsumer,
    WorkflowDecisionLogService,
    WorkflowRegistryService,
    GraphDunningExecutor,
    ConditionRegistry,
    ActionRegistry,
    PolicyService,
    AiAdvisorService,
    SimulationService,
    EventReplayService,
    FeatureFlagsService,
    DistributedLockService,
    DeadWorkflowRecoveryService,
    TimelineService,
    AnalyticsService,
    PredictiveService,
    OptimizerService,
    AssistantService,
    CustomerDispatchService,
    DedupStore,
    DeliveryStatusService,
    DispatchProducer,
    DispatchProcessor,
    DispatchBatchService,
    // Channel transports. Each is safe-by-default (no creds/template/SMTP ⇒
    // sent:false → ledger-only). WhatsAppAdapter is an own stateless instance
    // (reads WHATSAPP_* env); EmailCustomerSender uses the tenant's verified
    // SMTP sender via EmailSenderService + the @Global MailService.
    WhatsAppAdapter,
    WhatsAppCustomerSender,
    EmailCustomerSender,
    // Bound live, but the dispatch pipeline only calls the sender when the
    // tenant's `channel-routing` flag is on; the composite then routes each
    // request to its channel transport (WhatsApp/Email), else ledger-only.
    { provide: CUSTOMER_MESSAGE_SENDER, useClass: CompositeCustomerSender },
  ],
  exports: [
    WorkflowEngineConsumer,
    WorkflowRegistryService,
    GraphDunningExecutor,
    PolicyService,
    AiAdvisorService,
    SimulationService,
    EventReplayService,
    FeatureFlagsService,
    DistributedLockService,
    DeadWorkflowRecoveryService,
    TimelineService,
    AnalyticsService,
  ],
})
export class WorkflowEngineModule implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(WorkflowEngineModule.name);

  constructor(
    private readonly bus: EventBus,
    private readonly consumer: WorkflowEngineConsumer,
    private readonly registry: WorkflowRegistryService,
  ) {}

  onModuleInit(): void {
    this.bus.register(this.consumer);
  }

  async onApplicationBootstrap(): Promise<void> {
    // Best-effort: a seeding hiccup must never block application startup.
    try {
      await this.registry.seedSystemWorkflows();
    } catch (err) {
      this.logger.warn(`System workflow seeding skipped: ${(err as Error).message}`);
    }
  }
}
