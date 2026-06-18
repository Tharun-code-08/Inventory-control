import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from '../../common/branding/branding.service';
import { PdfBrandingAdapter } from '../../common/pdf/pdf-branding.adapter';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import { renderSalesOrderHtml, buildSalesOrderPdfViewModel, loadSalesOrderForPdf } from '../../common/pdf/builders/sales-order.builder';
import type { DocumentType } from '@prisma/client';

@Injectable()
export class QuotationPdfService {
  private readonly logger = new Logger(QuotationPdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: BrandingService,
  ) {}

  async generatePdf(quotationId: string): Promise<Buffer> {
    const quotation = await loadSalesOrderForPdf(this.prisma, quotationId);
    const shop = await this.prisma.shop.findUnique({
      where: { id: quotation.shopId },
      include: { company: { select: { id: true, companyName: true } } },
    });

    if (!shop || !shop.company) throw new Error(`Shop or company not found`);

    const snapshot = quotation.brandingSnapshot
      ? (quotation.brandingSnapshot as any)
      : await this.brandingService.createBrandingSnapshot(
          shop.company.id,
          quotation.shopId,
          'QUOTATION' as DocumentType
        );

    const viewModel = await buildSalesOrderPdfViewModel(this.prisma, quotation);
    let html = renderSalesOrderHtml(viewModel);
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot as any);

    const pdf = await renderHtmlToPdfBuffer(html);

    if (!quotation.brandingSnapshot) {
      await this.prisma.salesOrderHeader.update({
        where: { id: quotationId },
        data: { brandingSnapshot: snapshot as any },
      });
      this.logger.log(`Snapshot persisted for quotation ${quotationId}`);
    }

    return pdf;
  }

  async regeneratePdf(quotationId: string): Promise<Buffer> {
    const quotation = await loadSalesOrderForPdf(this.prisma, quotationId);
    if (!quotation.brandingSnapshot) throw new Error(`No branding snapshot`);

    const snapshot = quotation.brandingSnapshot as any;
    if (!this.brandingService.validateChecksumIntegrity(snapshot)) {
      this.logger.warn(`Checksum mismatch for quotation ${quotationId}`);
    }

    const viewModel = await buildSalesOrderPdfViewModel(this.prisma, quotation);
    let html = renderSalesOrderHtml(viewModel);
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot);

    return renderHtmlToPdfBuffer(html);
  }
}
