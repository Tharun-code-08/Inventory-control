import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentSeriesController } from './document-series.controller';
import { DocumentSeriesService } from './document-series.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentSeriesController],
  providers: [DocumentSeriesService],
  exports: [DocumentSeriesService],
})
export class DocumentSeriesModule {}
