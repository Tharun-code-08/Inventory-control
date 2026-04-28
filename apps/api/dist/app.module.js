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
const invoices_module_1 = require("./modules/invoices/invoices.module");
const payments_module_1 = require("./modules/payments/payments.module");
const alerts_module_1 = require("./modules/alerts/alerts.module");
const envFileCandidates = (0, resolve_env_files_1.resolveEnvFilePaths)(__dirname);
let AppModule = class AppModule {
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
                }),
            }),
            prisma_module_1.PrismaModule,
            audit_module_1.AuditModule,
            stock_module_1.StockModule,
            auth_module_1.AuthModule,
            shops_module_1.ShopsModule,
            products_module_1.ProductsModule,
            goods_receipts_module_1.GoodsReceiptsModule,
            goods_issues_module_1.GoodsIssuesModule,
            damaged_stock_module_1.DamagedStockModule,
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
            invoices_module_1.InvoicesModule,
            payments_module_1.PaymentsModule,
            alerts_module_1.AlertsModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map