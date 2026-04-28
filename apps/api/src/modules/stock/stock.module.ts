import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentNumberService } from './document-number.service';
import { StockService } from './stock.service';

@Module({
  imports: [PrismaModule],
  providers: [StockService, DocumentNumberService],
  exports: [StockService, DocumentNumberService],
})
export class StockModule {}
