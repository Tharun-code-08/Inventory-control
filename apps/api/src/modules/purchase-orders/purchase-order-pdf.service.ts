import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from '../../common/branding/branding.service';
import { PdfBrandingAdapter } from '../../common/pdf/pdf-branding.adapter';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import {
  buildPurchaseOrderPdfViewModel,
  loadPurchaseOrderForPdf,
  renderPurchaseOrderHtml,
} from '../../common/pdf/builders/purchase-order.builder';
import type { DocumentType } from '@prisma/client';

/**
 * Purchase Order PDF Service (Phase 2)
 *
 * Same pattern as InvoicePdfService:
 * 1. Load PO data
 * 2. Get or create branding snapshot
 * 3. Build HTML
 * 4. Apply branding via PdfBrandingAdapter.applyAllBranding()
 * 5. Render PDF
 * 6. Persist snapshot
 */
@Injectable()
export class PurchaseOrderPdfService {
  private readonly logger = new Logger(PurchaseOrderPdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: BrandingService,
  ) {}

  async generatePdf(poId: string): Promise<Buffer> {
    const po = await loadPurchaseOrderForPdf(this.prisma, poId);

    const shop = await this.prisma.shop.findUnique({
      where: { id: po.shopId },
      include: { company: { select: { id: true, companyName: true } } },
    });

    if (!shop || !shop.company) throw new Error(`Shop or company not found`);

    const snapshot = po.brandingSnapshot
      ? (po.brandingSnapshot as any)
      : await this.brandingService.createBrandingSnapshot(
          shop.company.id,
          po.shopId,
          'PURCHASE_ORDER' as DocumentType
        );

    const viewModel = await buildPurchaseOrderPdfViewModel(this.prisma, po, shop.company.id);
    let html = renderPurchaseOrderHtml(viewModel);

    // Single entry point: apply all branding
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot as any);

    const pdf = await renderHtmlToPdfBuffer(html);

    if (!po.brandingSnapshot) {
      await this.prisma.purchaseOrderHeader.update({
        where: { id: poId },
        data: { brandingSnapshot: snapshot as any },
      });
      this.logger.log(`Snapshot persisted for PO ${poId}`);
    }

    return pdf;
  }

  async regeneratePdf(poId: string): Promise<Buffer> {
    const po = await loadPurchaseOrderForPdf(this.prisma, poId);

    if (!po.brandingSnapshot) {
      throw new Error(`PO ${poId} has no branding snapshot`);
    }

    const snapshot = po.brandingSnapshot as any;

    if (!this.brandingService.validateChecksumIntegrity(snapshot)) {
      this.logger.warn(`Checksum mismatch for PO ${poId}`);
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: po.shopId },
      include: { company: { select: { id: true } } },
    });

    if (!shop || !shop.company) throw new Error(`Shop or company not found`);

    const viewModel = await buildPurchaseOrderPdfViewModel(this.prisma, po, shop.company.id);
    let html = renderPurchaseOrderHtml(viewModel);

    html = PdfBrandingAdapter.applyAllBranding(html, snapshot);

    return renderHtmlToPdfBuffer(html);
  }
}
