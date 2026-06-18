import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service';

export type EWayBillForPdf = {
  id: string;
  ewayBillNumber: string;
  documentDate: Date;
  shopId: string;
  brandingSnapshot?: any;
};

export type EWayBillPdfViewModel = {
  ewayBillNumber: string;
  documentDate: string;
  [key: string]: any;
};

export async function loadEWayBillForPdf(
  prisma: PrismaService,
  id: string,
): Promise<EWayBillForPdf> {
  const bill = await prisma.ewayBill.findUnique({
    where: { id },
    select: {
      id: true,
      ewayBillNumber: true,
      documentDate: true,
      shopId: true,
      brandingSnapshot: true,
    },
  });

  if (!bill) throw new NotFoundException(`E-Way Bill ${id} not found`);
  return bill;
}

export async function buildEWayBillPdfViewModel(
  prisma: PrismaService,
  bill: EWayBillForPdf,
): Promise<EWayBillPdfViewModel> {
  return {
    ewayBillNumber: bill.ewayBillNumber,
    documentDate: typeof bill.documentDate === 'string' ? bill.documentDate : bill.documentDate.toISOString(),
  };
}

export function renderEWayBillHtml(viewModel: EWayBillPdfViewModel): string {
  return `<html><body><h1>E-Way Bill ${viewModel.ewayBillNumber}</h1><p>Date: ${viewModel.documentDate}</p></body></html>`;
}
