import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BrandingModule } from '../branding/branding.module';
import { DocumentPdfService } from './document-pdf.service';

@Module({
  imports: [PrismaModule, BrandingModule],
  providers: [DocumentPdfService],
  exports: [DocumentPdfService],
})
export class PdfModule {}
