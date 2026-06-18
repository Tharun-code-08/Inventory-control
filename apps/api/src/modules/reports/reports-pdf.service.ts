import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandingService } from '../../common/branding/branding.service';
import { PdfBrandingAdapter } from '../../common/pdf/pdf-branding.adapter';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import { renderReportHtml, buildReportPdfViewModel } from '../../common/pdf/builders/report.builder';
import type { DocumentType } from '@prisma/client';

@Injectable()
export class ReportsPdfService {
  private readonly logger = new Logger(ReportsPdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: BrandingService,
  ) {}

  async generateReportPdf(shopId: string, reportType: string, filters: Record<string, any>): Promise<Buffer> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: { company: { select: { id: true, companyName: true } } },
    });

    if (!shop || !shop.company) throw new Error(`Shop or company not found`);

    const snapshot = await this.brandingService.createBrandingSnapshot(
      shop.company.id,
      shopId,
      'REPORT' as DocumentType
    );

    const viewModel = await buildReportPdfViewModel(this.prisma, shopId, reportType, filters);
    let html = renderReportHtml(viewModel);
    html = PdfBrandingAdapter.applyAllBranding(html, snapshot as any);

    const pdf = await renderHtmlToPdfBuffer(html);
    this.logger.log(`Generated ${reportType} report PDF for shop ${shopId}`);

    return pdf;
  }
}
