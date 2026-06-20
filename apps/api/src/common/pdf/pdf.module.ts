import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BrandingModule } from '../branding/branding.module';
import { DocumentPdfService } from './document-pdf.service';
import { DocumentPdfFacade } from './document-pdf.facade';
import { PdfRendererService } from './pdf-renderer.service';
import { HtmlToPdfService } from './html-to-pdf.service';

@Module({
  imports: [PrismaModule, BrandingModule],
  providers: [HtmlToPdfService, PdfRendererService, DocumentPdfService, DocumentPdfFacade],
  exports: [DocumentPdfFacade],
})
export class PdfModule {}
