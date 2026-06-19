import { Module } from '@nestjs/common';
import { CommonPdfModule } from '../../common/pdf/common-pdf.module';
import { DocumentEmailModule } from '../document-email/document-email.module';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [CommonPdfModule, DocumentEmailModule],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
