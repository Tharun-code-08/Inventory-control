import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from '../../common/branding/branding.service';
import { PdfBrandingAdapter } from '../../common/pdf/pdf-branding.adapter';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import { renderEWayBillHtml, buildEWayBillPdfViewModel, loadEWayBillForPdf } from '../../common/pdf/builders/eway-bill.builder';
import type { DocumentType } from '@prisma/client';

@Injectable()
export class EWayBillPdfService {
  private readonly logger = new Logger(EWayBillPdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: BrandingService,
  ) {}

  async generatePdf(billId: string): Promise<Buffer> {
    const bill = await loadEWayBillForPdf(this.prisma, billId);
    const shop = await this.prisma.shop.findUnique({
      where: { id: bill.shopId },
      include: { company: { select: { id: true, companyName: true } } },
    });

    if (!shop || !shop.company) throw new Error(`Shop or company not found`);

    const snapshot = bill.brandingSnapshot
      ? (bill.brandingSnapshot as any)
      : await this.brandingService.createBrandingSnapshot(
          shop.company.id,
          bill.shopId,
          'EWAY_BILL' as DocumentType
        );

    const viewModel = await buildEWayBillPdfViewModel(this.prisma, bill);
    let html = renderEWayBillHtml(viewModel);
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot as any);

    const pdf = await renderHtmlToPdfBuffer(html);

    if (!bill.brandingSnapshot) {
      await this.prisma.ewayBill.update({
        where: { id: billId },
        data: { brandingSnapshot: snapshot as any },
      });
      this.logger.log(`Snapshot persisted for e-way bill ${billId}`);
    }

    return pdf;
  }

  async regeneratePdf(billId: string): Promise<Buffer> {
    const bill = await loadEWayBillForPdf(this.prisma, billId);
    if (!bill.brandingSnapshot) throw new Error(`No branding snapshot`);

    const snapshot = bill.brandingSnapshot as any;
    if (!this.brandingService.validateChecksumIntegrity(snapshot)) {
      this.logger.warn(`Checksum mismatch for e-way bill ${billId}`);
    }

    const viewModel = await buildEWayBillPdfViewModel(this.prisma, bill);
    let html = renderEWayBillHtml(viewModel);
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot);

    return renderHtmlToPdfBuffer(html);
  }
}
