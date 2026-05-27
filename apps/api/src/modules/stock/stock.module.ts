import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentSeriesModule } from '../document-series/document-series.module';
import { CostingService } from './costing.service';
import { DocumentNumberService } from './document-number.service';
import { InventoryLotService } from './inventory-lot.service';
import { InventoryLotsController } from './inventory-lots.controller';
import { StockService } from './stock.service';

@Module({
  imports: [PrismaModule, DocumentSeriesModule],
  controllers: [InventoryLotsController],
  providers: [StockService, CostingService, DocumentNumberService, InventoryLotService],
  exports: [StockService, CostingService, DocumentNumberService, InventoryLotService],
})
export class StockModule {}
