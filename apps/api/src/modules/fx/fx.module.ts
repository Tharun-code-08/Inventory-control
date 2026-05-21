import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FxRateService } from './fx-rate.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FxRateService],
  exports: [FxRateService],
})
export class FxModule {}
