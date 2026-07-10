"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const throttler_1 = require("@nestjs/throttler");
const request_id_middleware_1 = require("./common/middleware/request-id.middleware");
const env_validation_1 = require("./config/env.validation");
const resolve_env_files_1 = require("./config/resolve-env-files");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const permissions_guard_1 = require("./common/guards/permissions.guard");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const shops_module_1 = require("./modules/shops/shops.module");
const products_module_1 = require("./modules/products/products.module");
const stock_module_1 = require("./modules/stock/stock.module");
const goods_receipts_module_1 = require("./modules/goods-receipts/goods-receipts.module");
const goods_issues_module_1 = require("./modules/goods-issues/goods-issues.module");
const damaged_stock_module_1 = require("./modules/damaged-stock/damaged-stock.module");
const stock_transfers_module_1 = require("./modules/stock-transfers/stock-transfers.module");
const purchase_orders_module_1 = require("./modules/purchase-orders/purchase-orders.module");
const reports_module_1 = require("./modules/reports/reports.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const users_module_1 = require("./modules/users/users.module");
const export_module_1 = require("./modules/export/export.module");
const audit_module_1 = require("./modules/audit/audit.module");
const companies_module_1 = require("./modules/companies/companies.module");
const storage_locations_module_1 = require("./modules/storage-locations/storage-locations.module");
const suppliers_module_1 = require("./modules/suppliers/suppliers.module");
const rfqs_module_1 = require("./modules/rfqs/rfqs.module");
const quotations_module_1 = require("./modules/quotations/quotations.module");
const contracts_module_1 = require("./modules/contracts/contracts.module");
const customers_module_1 = require("./modules/customers/customers.module");
const sales_orders_module_1 = require("./modules/sales-orders/sales-orders.module");
const sales_quotations_module_1 = require("./modules/sales-quotations/sales-quotations.module");
const invoices_module_1 = require("./modules/invoices/invoices.module");
const payments_module_1 = require("./modules/payments/payments.module");
const supplier_bills_module_1 = require("./modules/supplier-bills/supplier-bills.module");
const supplier_payments_module_1 = require("./modules/supplier-payments/supplier-payments.module");
const returns_module_1 = require("./modules/returns/returns.module");
const alerts_module_1 = require("./modules/alerts/alerts.module");
const supplier_portal_module_1 = require("./modules/supplier-portal/supplier-portal.module");
const quotation_portal_module_1 = require("./modules/quotation-portal/quotation-portal.module");
const health_module_1 = require("./modules/health/health.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const device_registration_module_1 = require("./modules/device-registration/device-registration.module");
const approvals_module_1 = require("./modules/approvals/approvals.module");
const eway_bills_module_1 = require("./modules/eway-bills/eway-bills.module");
const queues_module_1 = require("./common/queues/queues.module");
const queue_module_1 = require("./common/queue/queue.module");
const upload_module_1 = require("./common/upload/upload.module");
const observability_module_1 = require("./common/observability/observability.module");
const fx_module_1 = require("./modules/fx/fx.module");
const mail_module_1 = require("./common/mail/mail.module");
const billing_module_1 = require("./modules/billing/billing.module");
const postal_codes_module_1 = require("./modules/postal-codes/postal-codes.module");
const backup_module_1 = require("./modules/backup/backup.module");
const warehouse_module_1 = require("./modules/warehouse/warehouse.module");
const documents_module_1 = require("./modules/documents/documents.module");
const agent_platform_module_1 = require("./modules/agent-platform/agent-platform.module");
const envFileCandidates = (0, resolve_env_files_1.resolveEnvFilePaths)(__dirname);
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_id_middleware_1.RequestIdMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: envFileCandidates.length > 0 ? envFileCandidates : ['.env'],
                validationSchema: env_validation_1.envValidationSchema,
            }),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                global: true,
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const secret = config.get('JWT_SECRET') ?? process.env.JWT_SECRET;
                    if (!secret?.trim()) {
                        throw new Error('JWT_SECRET is missing. Ensure apps/api/.env exists and restart the API (see retail-ims/README).');
                    }
                    return {
                        secret,
                        signOptions: {
                            expiresIn: config.get('JWT_ACCESS_EXPIRES', '15m'),
                        },
                    };
                },
            }),
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        host: config.get('REDIS_HOST', '127.0.0.1'),
                        port: Number(config.get('REDIS_PORT', '6379')),
                    },
                    defaultJobOptions: {
                        attempts: 5,
                        backoff: { type: 'exponential', delay: 5_000 },
                        removeOnComplete: 100,
                        removeOnFail: 500,
                    },
                }),
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    throttlers: [
                        {
                            name: 'global',
                            ttl: Number(config.get('RATE_LIMIT_GLOBAL_TTL') ?? 60) * 1000,
                            limit: Number(config.get('RATE_LIMIT_GLOBAL_LIMIT') ?? 120),
                        },
                        {
                            name: 'auth',
                            ttl: Number(config.get('RATE_LIMIT_AUTH_TTL') ?? 60) * 1000,
                            limit: Number(config.get('RATE_LIMIT_AUTH_LIMIT') ?? 10),
                        },
                    ],
                }),
            }),
            prisma_module_1.PrismaModule,
            mail_module_1.MailModule,
            billing_module_1.BillingModule,
            postal_codes_module_1.PostalCodesModule,
            queues_module_1.QueuesModule,
            queue_module_1.QueueModule,
            upload_module_1.UploadModule,
            observability_module_1.ObservabilityModule,
            fx_module_1.FxModule,
            audit_module_1.AuditModule,
            stock_module_1.StockModule,
            auth_module_1.AuthModule,
            shops_module_1.ShopsModule,
            products_module_1.ProductsModule,
            goods_receipts_module_1.GoodsReceiptsModule,
            goods_issues_module_1.GoodsIssuesModule,
            damaged_stock_module_1.DamagedStockModule,
            stock_transfers_module_1.StockTransfersModule,
            purchase_orders_module_1.PurchaseOrdersModule,
            reports_module_1.ReportsModule,
            dashboard_module_1.DashboardModule,
            users_module_1.UsersModule,
            export_module_1.ExportModule,
            companies_module_1.CompaniesModule,
            storage_locations_module_1.StorageLocationsModule,
            suppliers_module_1.SuppliersModule,
            rfqs_module_1.RfqsModule,
            quotations_module_1.QuotationsModule,
            contracts_module_1.ContractsModule,
            customers_module_1.CustomersModule,
            sales_orders_module_1.SalesOrdersModule,
            sales_quotations_module_1.SalesQuotationsModule,
            invoices_module_1.InvoicesModule,
            payments_module_1.PaymentsModule,
            supplier_bills_module_1.SupplierBillsModule,
            supplier_payments_module_1.SupplierPaymentsModule,
            returns_module_1.ReturnsModule,
            alerts_module_1.AlertsModule,
            supplier_portal_module_1.SupplierPortalModule,
            quotation_portal_module_1.QuotationPortalModule,
            notifications_module_1.NotificationsModule,
            device_registration_module_1.DeviceRegistrationModule,
            approvals_module_1.ApprovalsModule,
            eway_bills_module_1.EwayBillsModule,
            health_module_1.HealthModule,
            backup_module_1.BackupModule,
            warehouse_module_1.WarehouseModule,
            documents_module_1.DocumentsModule,
            agent_platform_module_1.AgentPlatformModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map