import { Module } from '@nestjs/common';
import { EwayBillsController } from './eway-bills.controller';
import { EwayBillsService } from './eway-bills.service';

@Module({
  controllers: [EwayBillsController],
  providers: [EwayBillsService],
  exports: [EwayBillsService],
})
export class EwayBillsModule {}
