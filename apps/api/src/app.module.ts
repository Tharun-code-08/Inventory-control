import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { resolveEnvFilePaths } from './config/resolve-env-files';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ShopsModule } from './modules/shops/shops.module';
import { ProductsModule } from './modules/products/products.module';
import { StockModule } from './modules/stock/stock.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { GoodsIssuesModule } from './modules/goods-issues/goods-issues.module';
import { DamagedStockModule } from './modules/damaged-stock/damaged-stock.module';
import { StockTransfersModule } from './modules/stock-transfers/stock-transfers.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UsersModule } from './modules/users/users.module';
import { ExportModule } from './modules/export/export.module';
import { AuditModule } from './modules/audit/audit.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { StorageLocationsModule } from './modules/storage-locations/storage-locations.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { RfqsModule } from './modules/rfqs/rfqs.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { SalesQuotationsModule } from './modules/sales-quotations/sales-quotations.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SupplierBillsModule } from './modules/supplier-bills/supplier-bills.module';
import { SupplierPaymentsModule } from './modules/supplier-payments/supplier-payments.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { SupplierPortalModule } from './modules/supplier-portal/supplier-portal.module';
import { QuotationPortalModule } from './modules/quotation-portal/quotation-portal.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QueuesModule } from './common/queues/queues.module';
import { UploadModule } from './common/upload/upload.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { FxModule } from './modules/fx/fx.module';
import { MailModule } from './common/mail/mail.module';
import { BillingModule } from './modules/billing/billing.module';
import { PostalCodesModule } from './modules/postal-codes/postal-codes.module';
import { BackupModule } from './modules/backup/backup.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { DocumentSeriesModule } from './modules/document-series/document-series.module';

const envFileCandidates = resolveEnvFilePaths(__dirname);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFileCandidates.length > 0 ? envFileCandidates : ['.env'],
      validationSchema: envValidationSchema,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;
        if (!secret?.trim()) {
          throw new Error(
            'JWT_SECRET is missing. Ensure apps/api/.env exists and restart the API (see retail-ims/README).',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: config.get<string>('JWT_ACCESS_EXPIRES', '15m') as
              | `${number}m`
              | `${number}d`
              | `${number}h`,
          },
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
        },
        // Sensible global defaults: 5 attempts with exponential backoff, keep
        // the last 100 successes for debugging, keep the last 500 failures so
        // ops can inspect them via Bull Board / queue endpoints.
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'global',
            ttl: Number(config.get<string | number>('RATE_LIMIT_GLOBAL_TTL') ?? 60) * 1000,
            limit: Number(config.get<string | number>('RATE_LIMIT_GLOBAL_LIMIT') ?? 120),
          },
          {
            name: 'auth',
            ttl: Number(config.get<string | number>('RATE_LIMIT_AUTH_TTL') ?? 60) * 1000,
            limit: Number(config.get<string | number>('RATE_LIMIT_AUTH_LIMIT') ?? 10),
          },
        ],
      }),
    }),
    PrismaModule,
    MailModule,
    BillingModule,
    PostalCodesModule,
    QueuesModule,
    UploadModule,
    ObservabilityModule,
    FxModule,
    AuditModule,
    StockModule,
    AuthModule,
    ShopsModule,
    ProductsModule,
    GoodsReceiptsModule,
    GoodsIssuesModule,
    DamagedStockModule,
    StockTransfersModule,
    PurchaseOrdersModule,
    ReportsModule,
    DashboardModule,
    UsersModule,
    ExportModule,
    CompaniesModule,
    StorageLocationsModule,
    SuppliersModule,
    RfqsModule,
    QuotationsModule,
    ContractsModule,
    CustomersModule,
    SalesOrdersModule,
    SalesQuotationsModule,
    InvoicesModule,
    PaymentsModule,
    SupplierBillsModule,
    SupplierPaymentsModule,
    ReturnsModule,
    AlertsModule,
    SupplierPortalModule,
    QuotationPortalModule,
    NotificationsModule,
    HealthModule,
    BackupModule,
    WarehouseModule,
    DocumentSeriesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
