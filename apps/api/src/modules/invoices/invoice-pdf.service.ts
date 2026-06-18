import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from '../../common/branding/branding.service';
import { PdfBrandingAdapter } from '../../common/pdf/pdf-branding.adapter';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import {
  buildInvoicePdfViewModel,
  loadInvoiceForPdf,
  renderInvoiceHtml,
} from '../../common/pdf/builders/invoice.builder';
import type { DocumentType } from '@prisma/client';

/**
 * Invoice PDF Service (Phase 2: Branding Integration)
 *
 * Generates invoices with historical branding accuracy.
 *
 * Flow:
 * 1. Load invoice data
 * 2. Get or create immutable branding snapshot
 * 3. Build HTML
 * 4. Apply branding via PdfBrandingAdapter (single entry point)
 * 5. Render to PDF
 * 6. Save snapshot with invoice
 */
@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: BrandingService,
  ) {}

  /**
   * Generate invoice PDF with branding snapshot
   */
  async generatePdf(invoiceId: string): Promise<Buffer> {
    // 1. Load invoice and related data
    const invoice = await loadInvoiceForPdf(this.prisma, invoiceId);

    // 2. Load shop/company context for branding
    const shop = await this.prisma.shop.findUnique({
      where: { id: invoice.shopId },
      include: {
        company: {
          select: { id: true, companyName: true, brandingProfile: true },
        },
      },
    });

    if (!shop || !shop.company) throw new Error(`Shop or company not found for ${invoice.shopId}`);

    // 3. Get or create immutable branding snapshot
    // If snapshot already exists, use it (historical accuracy)
    // If not, create one (new invoice)
    const snapshot = invoice.brandingSnapshot
      ? (invoice.brandingSnapshot as any) // Cast from JsonValue to BrandingSnapshotV1
      : await this.brandingService.createBrandingSnapshot(
          shop.company.id,
          invoice.shopId,
          'INVOICE' as DocumentType
        );

    // 4. Build invoice view model and HTML
    const viewModel = await buildInvoicePdfViewModel(this.prisma, invoice);
    let html = renderInvoiceHtml(viewModel);

    // 5. Apply branding (SINGLE ENTRY POINT - PdfBrandingAdapter.applyAllBranding)
    // This automatically applies:
    // - Company logo, name, GST, address
    // - Signature, seal (if enabled)
    // - Theme colors
    // - Footer text
    // - All based on documentSettings from snapshot
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot as any);

    // 6. Render to PDF
    const pdf = await renderHtmlToPdfBuffer(html);

    // 7. Update invoice with snapshot (if new)
    if (!invoice.brandingSnapshot) {
      await this.prisma.invoiceHeader.update({
        where: { id: invoiceId },
        data: {
          brandingSnapshot: snapshot as any,
        },
      });
      this.logger.log(`Snapshot persisted for invoice ${invoiceId}`);
    }

    return pdf;
  }

  /**
   * Regenerate invoice PDF with original branding
   * (Used when reprinting old invoices)
   */
  async regeneratePdf(invoiceId: string): Promise<Buffer> {
    // Same flow as generatePdf, but snapshot is guaranteed to exist
    const invoice = await loadInvoiceForPdf(this.prisma, invoiceId);

    if (!invoice.brandingSnapshot) {
      throw new Error(
        `Invoice ${invoiceId} has no branding snapshot. Cannot regenerate with historical accuracy.`
      );
    }

    const snapshot = invoice.brandingSnapshot as any;

    // Verify snapshot integrity
    if (!this.brandingService.validateChecksumIntegrity(snapshot)) {
      this.logger.warn(
        `Checksum mismatch for invoice ${invoiceId}. Snapshot may be corrupted.`
      );
      // Could throw here, or regenerate with current branding
      // For now, log warning and regenerate with current branding
    }

    const viewModel = await buildInvoicePdfViewModel(this.prisma, invoice);
    let html = renderInvoiceHtml(viewModel);

    // Apply original branding from snapshot
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot);

    return renderHtmlToPdfBuffer(html);
  }
}
