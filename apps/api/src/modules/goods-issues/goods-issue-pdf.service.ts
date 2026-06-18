import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from '../../common/branding/branding.service';
import { PdfBrandingAdapter } from '../../common/pdf/pdf-branding.adapter';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import { renderGoodsIssueHtml, buildGoodsIssuePdfViewModel, loadGoodsIssueForPdf } from '../../common/pdf/builders/goods-issue.builder';
import type { DocumentType } from '@prisma/client';

@Injectable()
export class GoodsIssuePdfService {
  private readonly logger = new Logger(GoodsIssuePdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: BrandingService,
  ) {}

  async generatePdf(issueId: string): Promise<Buffer> {
    const issue = await loadGoodsIssueForPdf(this.prisma, issueId);
    const shop = await this.prisma.shop.findUnique({
      where: { id: issue.shopId },
      include: { company: { select: { id: true, companyName: true } } },
    });

    if (!shop || !shop.company) throw new Error(`Shop or company not found`);

    const snapshot = issue.brandingSnapshot
      ? (issue.brandingSnapshot as any)
      : await this.brandingService.createBrandingSnapshot(
          shop.company.id,
          issue.shopId,
          'GOODS_ISSUE' as DocumentType
        );

    const viewModel = await buildGoodsIssuePdfViewModel(this.prisma, issue);
    let html = renderGoodsIssueHtml(viewModel);
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot as any);

    const pdf = await renderHtmlToPdfBuffer(html);

    if (!issue.brandingSnapshot) {
      await this.prisma.goodsIssueHeader.update({
        where: { id: issueId },
        data: { brandingSnapshot: snapshot as any },
      });
      this.logger.log(`Snapshot persisted for goods issue ${issueId}`);
    }

    return pdf;
  }

  async regeneratePdf(issueId: string): Promise<Buffer> {
    const issue = await loadGoodsIssueForPdf(this.prisma, issueId);
    if (!issue.brandingSnapshot) throw new Error(`No branding snapshot`);

    const snapshot = issue.brandingSnapshot as any;
    if (!this.brandingService.validateChecksumIntegrity(snapshot)) {
      this.logger.warn(`Checksum mismatch for goods issue ${issueId}`);
    }

    const viewModel = await buildGoodsIssuePdfViewModel(this.prisma, issue);
    let html = renderGoodsIssueHtml(viewModel);
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot);

    return renderHtmlToPdfBuffer(html);
  }
}
