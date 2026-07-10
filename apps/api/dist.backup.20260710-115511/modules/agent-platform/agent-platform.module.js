"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentPlatformModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const barcodes_module_1 = require("../barcodes/barcodes.module");
const customers_module_1 = require("../customers/customers.module");
const damaged_stock_module_1 = require("../damaged-stock/damaged-stock.module");
const goods_receipts_module_1 = require("../goods-receipts/goods-receipts.module");
const invoices_module_1 = require("../invoices/invoices.module");
const products_module_1 = require("../products/products.module");
const purchase_orders_module_1 = require("../purchase-orders/purchase-orders.module");
const reports_module_1 = require("../reports/reports.module");
const sales_orders_module_1 = require("../sales-orders/sales-orders.module");
const shops_module_1 = require("../shops/shops.module");
const storage_locations_module_1 = require("../storage-locations/storage-locations.module");
const stock_transfers_module_1 = require("../stock-transfers/stock-transfers.module");
const suppliers_module_1 = require("../suppliers/suppliers.module");
const ai_orchestrator_service_1 = require("./ai/ai-orchestrator.service");
const ai_provider_token_1 = require("./ai/provider/ai-provider.token");
const deepseek_provider_1 = require("./ai/provider/deepseek.provider");
const read_tools_service_1 = require("./ai/tools/read/read-tools.service");
const catalog_write_tools_service_1 = require("./ai/tools/write/catalog-write-tools.service");
const goods_receipt_write_tools_service_1 = require("./ai/tools/write/goods-receipt-write-tools.service");
const inventory_write_tools_service_1 = require("./ai/tools/write/inventory-write-tools.service");
const invoice_write_tools_service_1 = require("./ai/tools/write/invoice-write-tools.service");
const partner_write_tools_service_1 = require("./ai/tools/write/partner-write-tools.service");
const purchase_write_tools_service_1 = require("./ai/tools/write/purchase-write-tools.service");
const stock_transfer_write_tools_service_1 = require("./ai/tools/write/stock-transfer-write-tools.service");
const notification_processor_1 = require("./notifications/notification.processor");
const notification_scheduler_service_1 = require("./notifications/notification-scheduler.service");
const platform_health_service_1 = require("./ai/platform-health.service");
const sales_write_tools_service_1 = require("./ai/tools/write/sales-write-tools.service");
const tool_registry_1 = require("./ai/tools/tool-registry");
const agent_task_service_1 = require("./tasks/agent-task.service");
const task_executor_service_1 = require("./tasks/task-executor.service");
const task_flow_service_1 = require("./tasks/task-flow.service");
const usage_limit_service_1 = require("./ai/usage/usage-limit.service");
const whatsapp_webhook_controller_1 = require("./channels/whatsapp/whatsapp-webhook.controller");
const ai_settings_controller_1 = require("./settings/ai-settings.controller");
const whatsapp_adapter_1 = require("./channels/whatsapp/whatsapp.adapter");
const notifications_module_1 = require("../notifications/notifications.module");
const conversation_processor_1 = require("./conversation/conversation.processor");
const conversation_service_1 = require("./conversation/conversation.service");
const intent_service_1 = require("./intent/intent.service");
const link_controller_1 = require("./link/link.controller");
const link_service_1 = require("./link/link.service");
const link_token_cleanup_service_1 = require("./link/link-token-cleanup.service");
const cache_module_1 = require("../../common/cache/cache.module");
const ai_settings_service_1 = require("./settings/ai-settings.service");
let AgentPlatformModule = class AgentPlatformModule {
};
exports.AgentPlatformModule = AgentPlatformModule;
exports.AgentPlatformModule = AgentPlatformModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({ name: 'whatsapp' }),
            bullmq_1.BullModule.registerQueue({ name: 'agent-notifications' }),
            cache_module_1.CacheModule,
            notifications_module_1.NotificationsModule,
            reports_module_1.ReportsModule,
            products_module_1.ProductsModule,
            barcodes_module_1.BarcodesModule,
            shops_module_1.ShopsModule,
            purchase_orders_module_1.PurchaseOrdersModule,
            sales_orders_module_1.SalesOrdersModule,
            customers_module_1.CustomersModule,
            goods_receipts_module_1.GoodsReceiptsModule,
            storage_locations_module_1.StorageLocationsModule,
            invoices_module_1.InvoicesModule,
            stock_transfers_module_1.StockTransfersModule,
            suppliers_module_1.SuppliersModule,
            damaged_stock_module_1.DamagedStockModule,
        ],
        controllers: [whatsapp_webhook_controller_1.WhatsAppWebhookController, link_controller_1.LinkController, ai_settings_controller_1.AiSettingsController],
        providers: [
            whatsapp_adapter_1.WhatsAppAdapter,
            conversation_service_1.ConversationService,
            conversation_processor_1.ConversationProcessor,
            link_service_1.LinkService,
            link_token_cleanup_service_1.LinkTokenCleanupService,
            intent_service_1.IntentService,
            tool_registry_1.ToolRegistry,
            read_tools_service_1.ReadToolsService,
            agent_task_service_1.AgentTaskService,
            task_executor_service_1.TaskExecutorService,
            task_flow_service_1.TaskFlowService,
            purchase_write_tools_service_1.PurchaseWriteToolsService,
            sales_write_tools_service_1.SalesWriteToolsService,
            goods_receipt_write_tools_service_1.GoodsReceiptWriteToolsService,
            invoice_write_tools_service_1.InvoiceWriteToolsService,
            stock_transfer_write_tools_service_1.StockTransferWriteToolsService,
            inventory_write_tools_service_1.InventoryWriteToolsService,
            catalog_write_tools_service_1.CatalogWriteToolsService,
            partner_write_tools_service_1.PartnerWriteToolsService,
            notification_scheduler_service_1.NotificationSchedulerService,
            notification_processor_1.NotificationProcessor,
            platform_health_service_1.PlatformHealthService,
            deepseek_provider_1.DeepSeekProvider,
            {
                provide: ai_provider_token_1.AI_PROVIDER,
                inject: [config_1.ConfigService, deepseek_provider_1.DeepSeekProvider],
                useFactory: (config, deepseek) => {
                    const provider = config.get('AI_PROVIDER') ?? 'deepseek';
                    const openAiCompatible = {
                        deepseek,
                        fireworks: deepseek,
                        openai: deepseek,
                    };
                    if (provider in openAiCompatible)
                        return openAiCompatible[provider];
                    throw new Error(`AI_PROVIDER "${provider}" has no registered implementation`);
                },
            },
            ai_settings_service_1.AiSettingsService,
            usage_limit_service_1.UsageLimitService,
            ai_orchestrator_service_1.AiOrchestratorService,
        ],
        exports: [conversation_service_1.ConversationService],
    })
], AgentPlatformModule);
//# sourceMappingURL=agent-platform.module.js.map