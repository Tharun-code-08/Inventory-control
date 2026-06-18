import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from '../../common/branding/branding.service';
import { PdfBrandingAdapter } from '../../common/pdf/pdf-branding.adapter';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import { renderGoodsReceiptHtml, buildGoodsReceiptPdfViewModel, loadGoodsReceiptForPdf } from '../../common/pdf/builders/goods-receipt.builder';
import type { DocumentType } from '@prisma/client';

@Injectable()
export class GoodsReceiptPdfService {
  private readonly logger = new Logger(GoodsReceiptPdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: BrandingService,
  ) {}

  async generatePdf(receiptId: string): Promise<Buffer> {
    const receipt = await loadGoodsReceiptForPdf(this.prisma, receiptId);
    const shop = await this.prisma.shop.findUnique({
      where: { id: receipt.shopId },
      include: { company: { select: { id: true, companyName: true } } },
    });

    if (!shop || !shop.company) throw new Error(`Shop or company not found`);

    const snapshot = receipt.brandingSnapshot
      ? (receipt.brandingSnapshot as any)
      : await this.brandingService.createBrandingSnapshot(
          shop.company.id,
          receipt.shopId,
          'GOODS_RECEIPT' as DocumentType
        );

    const viewModel = await buildGoodsReceiptPdfViewModel(this.prisma, receipt);
    let html = renderGoodsReceiptHtml(viewModel);
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot as any);

    const pdf = await renderHtmlToPdfBuffer(html);

    if (!receipt.brandingSnapshot) {
      await this.prisma.goodsReceiptHeader.update({
        where: { id: receiptId },
        data: { brandingSnapshot: snapshot as any },
      });
      this.logger.log(`Snapshot persisted for goods receipt ${receiptId}`);
    }

    return pdf;
  }

  async regeneratePdf(receiptId: string): Promise<Buffer> {
    const receipt = await loadGoodsReceiptForPdf(this.prisma, receiptId);
    if (!receipt.brandingSnapshot) throw new Error(`No branding snapshot`);

    const snapshot = receipt.brandingSnapshot as any;
    if (!this.brandingService.validateChecksumIntegrity(snapshot)) {
      this.logger.warn(`Checksum mismatch for goods receipt ${receiptId}`);
    }

    const viewModel = await buildGoodsReceiptPdfViewModel(this.prisma, receipt);
    let html = renderGoodsReceiptHtml(viewModel);
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot);

    return renderHtmlToPdfBuffer(html);
  }
}
