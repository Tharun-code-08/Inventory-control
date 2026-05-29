import { Module } from '@nestjs/common';
import { PdfModule } from '../../common/pdf/pdf.module';
import { DocumentEmailModule } from '../document-email/document-email.module';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [PdfModule, DocumentEmailModule],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
