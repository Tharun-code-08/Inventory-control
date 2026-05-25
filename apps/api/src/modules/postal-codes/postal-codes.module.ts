import { Module } from '@nestjs/common';
import { PostalCodesController } from './postal-codes.controller';
import { PostalCodesService } from './postal-codes.service';

@Module({
  controllers: [PostalCodesController],
  providers: [PostalCodesService],
})
export class PostalCodesModule {}
