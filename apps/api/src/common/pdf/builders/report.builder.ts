import type { PrismaService } from '../../../prisma/prisma.service';

export type ReportPdfViewModel = {
  reportType: string;
  generatedAt: string;
  [key: string]: any;
};

export async function buildReportPdfViewModel(
  prisma: PrismaService,
  shopId: string,
  reportType: string,
  filters: Record<string, any>,
): Promise<ReportPdfViewModel> {
  return {
    reportType,
    generatedAt: new Date().toISOString(),
    ...filters,
  };
}

export function renderReportHtml(viewModel: ReportPdfViewModel): string {
  return `<html><body><h1>${viewModel.reportType} Report</h1><p>Generated: ${viewModel.generatedAt}</p></body></html>`;
}
