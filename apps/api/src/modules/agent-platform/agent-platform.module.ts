import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BarcodesModule } from '../barcodes/barcodes.module';
import { CustomersModule } from '../customers/customers.module';
import { GoodsReceiptsModule } from '../goods-receipts/goods-receipts.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ProductsModule } from '../products/products.module';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { ReportsModule } from '../reports/reports.module';
import { SalesOrdersModule } from '../sales-orders/sales-orders.module';
import { ShopsModule } from '../shops/shops.module';
import { StorageLocationsModule } from '../storage-locations/storage-locations.module';
import { StockTransfersModule } from '../stock-transfers/stock-transfers.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { AiOrchestratorService } from './ai/ai-orchestrator.service';
import type { AiProvider } from './ai/provider/ai-provider.interface';
import { AI_PROVIDER } from './ai/provider/ai-provider.token';
import { DeepSeekProvider } from './ai/provider/deepseek.provider';
import { ReadToolsService } from './ai/tools/read/read-tools.service';
import { GoodsReceiptWriteToolsService } from './ai/tools/write/goods-receipt-write-tools.service';
import { InvoiceWriteToolsService } from './ai/tools/write/invoice-write-tools.service';
import { PurchaseWriteToolsService } from './ai/tools/write/purchase-write-tools.service';
import { StockTransferWriteToolsService } from './ai/tools/write/stock-transfer-write-tools.service';
import { NotificationProcessor } from './notifications/notification.processor';
import { NotificationSchedulerService } from './notifications/notification-scheduler.service';
import { PlatformHealthService } from './ai/platform-health.service';
import { SalesWriteToolsService } from './ai/tools/write/sales-write-tools.service';
import { ToolRegistry } from './ai/tools/tool-registry';
import { AgentTaskService } from './tasks/agent-task.service';
import { TaskExecutorService } from './tasks/task-executor.service';
import { TaskFlowService } from './tasks/task-flow.service';
import { UsageLimitService } from './ai/usage/usage-limit.service';
import { WhatsAppWebhookController } from './channels/whatsapp/whatsapp-webhook.controller';
import { AiSettingsController } from './settings/ai-settings.controller';
import { WhatsAppModule } from './channels/whatsapp/whatsapp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConversationProcessor } from './conversation/conversation.processor';
import { ConversationService } from './conversation/conversation.service';
import { IntentService } from './intent/intent.service';
import { LinkController } from './link/link.controller';
import { LinkService } from './link/link.service';
import { LinkTokenCleanupService } from './link/link-token-cleanup.service';
import { CacheModule } from '@/common/cache/cache.module';
import { AiSettingsService } from './settings/ai-settings.service';

/**
 * Agent Platform — conversational AI over messaging channels.
 * Phase 1: WhatsApp (Meta Cloud API) webhook + outbound queue, secure OTP
 * number linking, persisted conversations.
 * Phase 2: read-only AI assistant — intent rules, provider-agnostic AI layer
 * (DeepSeek first; the AI_PROVIDER env value picks the implementation behind
 * the DI token, so adding a provider = new class + one factory case),
 * declarative tool registry over existing ERP services, per-tenant
 * settings/flags/quotas, usage metering.
 * Phase 3: business automation — write tools draft an AgentTask (never
 * execute); the user's "approve" runs it through the ERP service with
 * idempotency, atomic state transitions, and audit (purchase orders, sales
 * orders, goods receipts, invoices, stock transfers). Scheduled notifications
 * (daily summary, low-stock alert, overdue-payment reminder) are opt-in via
 * AGENT_NOTIFICATIONS_ENABLED=true; cron times are configurable per env.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'whatsapp' }),
    BullModule.registerQueue({ name: 'agent-notifications' }),
    WhatsAppModule,
    NotificationsModule,
    CacheModule,
    ReportsModule,
    ProductsModule,
    BarcodesModule,
    ShopsModule,
    PurchaseOrdersModule,
    SalesOrdersModule,
    CustomersModule,
    GoodsReceiptsModule,
    StorageLocationsModule,
    InvoicesModule,
    StockTransfersModule,
    SuppliersModule,
  ],
  controllers: [WhatsAppWebhookController, LinkController, AiSettingsController],
  providers: [
    ConversationService,
    ConversationProcessor,
    LinkService,
    LinkTokenCleanupService,
    IntentService,
    ToolRegistry,
    ReadToolsService,
    AgentTaskService,
    TaskExecutorService,
    TaskFlowService,
    PurchaseWriteToolsService,
    SalesWriteToolsService,
    GoodsReceiptWriteToolsService,
    InvoiceWriteToolsService,
    StockTransferWriteToolsService,
    NotificationSchedulerService,
    NotificationProcessor,
    PlatformHealthService,
    DeepSeekProvider,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, DeepSeekProvider],
      useFactory: (config: ConfigService, deepseek: DeepSeekProvider): AiProvider => {
        const provider = config.get<string>('AI_PROVIDER') ?? 'deepseek';
        // All OpenAI-compatible providers share the same client implementation.
        // Adding a new compatible provider = add to env.validation.ts whitelist
        // + add an entry here pointing to its client. No application code changes.
        const openAiCompatible: Record<string, AiProvider> = {
          deepseek,
          fireworks: deepseek,
          openai: deepseek,
        };
        if (provider in openAiCompatible) return openAiCompatible[provider];
        throw new Error(`AI_PROVIDER "${provider}" has no registered implementation`);
      },
    },
    AiSettingsService,
    UsageLimitService,
    AiOrchestratorService,
  ],
  exports: [ConversationService],
})
export class AgentPlatformModule {}
