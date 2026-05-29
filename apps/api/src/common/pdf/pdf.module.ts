import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentPdfService } from './document-pdf.service';

@Module({
  imports: [PrismaModule],
  providers: [DocumentPdfService],
  exports: [DocumentPdfService],
})
export class PdfModule {}
