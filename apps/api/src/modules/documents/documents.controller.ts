import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { BadRequestException } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { isDocumentPdfKind } from '../../common/pdf/document-pdf.types';
import { DocumentEmailService } from '../document-email/document-email.service';
import { DOCUMENT_KIND_TO_ENTITY } from '../document-email/document-email.constants';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentPdf: DocumentPdfService,
    private readonly documentEmail: DocumentEmailService,
  ) {}

  @Get(':kind/:id/pdf')
  async downloadPdf(
    @CurrentUser() user: RequestUser,
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (!isDocumentPdfKind(kind)) {
      throw new BadRequestException(`Unsupported document kind: ${kind}`);
    }

    const result = await this.documentPdf.renderPdf(user, kind, id);
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length,
    });
    res.send(result.buffer);
  }

  @Get(':kind/:id/email-history')
  async emailHistory(
    @CurrentUser() user: RequestUser,
    @Param('kind') kind: string,
    @Param('id') id: string,
  ) {
    if (!isDocumentPdfKind(kind)) {
      throw new BadRequestException(`Unsupported document kind: ${kind}`);
    }

    await this.documentPdf.assertDocumentAccess(user, kind, id);

    const entityType = DOCUMENT_KIND_TO_ENTITY[kind] ?? kind;
    const [history, summary] = await Promise.all([
      this.documentEmail.listHistory(entityType, id),
      this.documentEmail.getLatestSummary(entityType, id),
    ]);

    return { data: { history, summary } };
  }
}
