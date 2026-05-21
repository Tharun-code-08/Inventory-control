import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CostingService } from './costing.service';
import { DocumentNumberService } from './document-number.service';
import { StockService } from './stock.service';

@Module({
  imports: [PrismaModule],
  providers: [StockService, CostingService, DocumentNumberService],
  exports: [StockService, CostingService, DocumentNumberService],
})
export class StockModule {}
