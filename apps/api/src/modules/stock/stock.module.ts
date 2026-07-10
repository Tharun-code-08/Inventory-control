import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentSeriesModule } from '../document-series/document-series.module';
import { EventPlatformModule } from '../../common/event-platform/event-platform.module';
import { CostingService } from './costing.service';
import { DocumentNumberService } from './document-number.service';
import { InventoryLotService } from './inventory-lot.service';
import { InventoryLotsController } from './inventory-lots.controller';
import { StockService } from './stock.service';
import { ExpiryScanScheduler } from './expiry-scan.scheduler';
import { ExpiryScanProcessor } from './expiry-scan.processor';
import { EXPIRY_SCAN_QUEUE } from './expiry-scan.constants';
import { InventoryHealthController } from './inventory-health.controller';
import { ExceptionEngineService } from './exception-engine/exception-engine.service';
import { HealthScoreService } from './exception-engine/health-score.service';
import { ExpiryRule } from './exception-engine/rules/expiry.rule';
import { LowStockRule } from './exception-engine/rules/low-stock.rule';
import { TransferRule } from './exception-engine/rules/transfer.rule';
import { BlockedLotRule } from './exception-engine/rules/blocked-lot.rule';
import { IntegrityRule } from './exception-engine/rules/integrity.rule';

@Module({
  imports: [
    PrismaModule,
    DocumentSeriesModule,
    EventPlatformModule,
    BullModule.registerQueue({ name: EXPIRY_SCAN_QUEUE }),
  ],
  controllers: [InventoryLotsController, InventoryHealthController],
  providers: [
    StockService,
    CostingService,
    DocumentNumberService,
    InventoryLotService,
    ExpiryScanScheduler,
    ExpiryScanProcessor,
    ExceptionEngineService,
    HealthScoreService,
    ExpiryRule,
    LowStockRule,
    TransferRule,
    BlockedLotRule,
    IntegrityRule,
  ],
  exports: [
    StockService,
    CostingService,
    DocumentNumberService,
    InventoryLotService,
    ExceptionEngineService,
    HealthScoreService,
  ],
})
export class StockModule implements OnModuleInit {
  constructor(
    private readonly exceptionEngine: ExceptionEngineService,
    private readonly expiryRule: ExpiryRule,
    private readonly lowStockRule: LowStockRule,
    private readonly transferRule: TransferRule,
    private readonly blockedLotRule: BlockedLotRule,
    private readonly integrityRule: IntegrityRule,
  ) {
    console.log('[✓ StockModule] Constructed with exception engine and 5 rules');
  }

  onModuleInit() {
    console.log('[✓ StockModule.onModuleInit] Registering 5 exception rules...');
    this.exceptionEngine.registerRule(this.expiryRule);
    this.exceptionEngine.registerRule(this.lowStockRule);
    this.exceptionEngine.registerRule(this.transferRule);
    this.exceptionEngine.registerRule(this.blockedLotRule);
    this.exceptionEngine.registerRule(this.integrityRule);
    console.log('[✓ StockModule] All rules registered');
  }
}
