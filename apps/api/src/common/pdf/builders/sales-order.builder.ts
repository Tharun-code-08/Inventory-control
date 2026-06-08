import { NotFoundException } from '@nestjs/common';
import { GstSupplyType } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import { isInterStateSupply } from '../../utils/gst-supply-type';
import {
  amountInIndianWords,
  documentPdfFilename,
  formatDocumentAmount,
  formatDocumentDate,
  formatDocumentDateTime,
  formatDocumentMoney,
} from '../document-pdf.formatters';
import {
  buildGstSalesDocumentHtml,
  type GstSalesDocumentViewModel,
} from '../templates/gst-sales-document.template';
import { customerPartyLines, loadShopCompanyContext } from './shop-company';

const MIN_ROWS = 6;

function parseRemarksField(remarks: string | null | undefined, pattern: RegExp): string | undefined {
  if (!remarks) return undefined;
  const match = remarks.match(pattern);
  return match?.[1]?.split('\n')[0]?.trim() || undefined;
}

function parseSalesOrderRemarks(remarks: string | null | undefined) {
  const paymentTerms = parseRemarksField(remarks, /Payment terms:\s*(.+)/i);
  const customerPoNumber =
    parseRemarksField(remarks, /(?:Customer PO|PO #|PO No\.?):\s*(.+)/i) ??
    parseRemarksField(remarks, /PO:\s*(.+)/i);
  const subject = parseRemarksField(remarks, /(?:Subject|Sub):\s*(.+)/i);
  let notes = remarks?.trim() ?? '';
  notes = notes
    .replace(/Payment terms:\s*.+/i, '')
    .replace(/(?:Customer PO|PO #|PO No\.?|PO):\s*.+/i, '')
    .replace(/(?:Subject|Sub):\s*.+/i, '')
    .replace(/Delivery:\s*.+/i, '')
    .trim();
  return { paymentTerms, customerPoNumber, subject, notes: notes || undefined };
}

function placeOfSupplyFromCustomer(customer: {
  state?: string | null;
  taxId?: string | null;
}): string | undefined {
  const state = customer.state?.trim();
  const stateCode = customer.taxId?.trim().slice(0, 2);
  if (!state && !stateCode) return undefined;
  if (state && stateCode) return `${state} (${stateCode})`;
  return state ?? stateCode;
}

function formatGstPercent(value: number): string {
  return value > 0 ? `${formatDocumentMoney(value)}%` : '—';
}

function formatGstAmount(value: number): string {
  return value > 0 ? formatDocumentAmount(value) : '—';
}

export async function loadSalesOrderForPdf(prisma: PrismaService, id: string) {
  const order = await prisma.salesOrderHeader.findUnique({
    where: { id },
    include: {
      customer: true,
      shop: { select: { shopName: true } },
      salesQuotation: { select: { quoteNumber: true } },
      createdBy: { select: { name: true } },
      items: {
        include: {
          product: { select: { productCode: true, description: true, hsnCode: true } },
        },
      },
    },
  });
  if (!order) throw new NotFoundException('Sales order not found');
  return order;
}

export async function buildSalesOrderPdfViewModel(
  prisma: PrismaService,
  order: Awaited<ReturnType<typeof loadSalesOrderForPdf>>,
): Promise<GstSalesDocumentViewModel> {
  const ctx = await loadShopCompanyContext(prisma, order.shopId);
  const parsedRemarks = parseSalesOrderRemarks(order.remarks);
  const isInterState = isInterStateSupply(order.gstSupplyType ?? GstSupplyType.INTRA_STATE);

  const lines = order.items.map((item) => {
    const taxAmount = Number(item.taxAmount);
    const lineBase = Number(item.lineValue) - taxAmount;
    const cgstRate = Number(item.cgstRate ?? 0);
    const sgstRate = Number(item.sgstRate ?? 0);
    const igstRate = Number(item.igstRate ?? 0);
    const rateSum = cgstRate + sgstRate;
    const cgstAmount = isInterState || rateSum <= 0 ? 0 : (taxAmount * cgstRate) / rateSum;
    const sgstAmount = isInterState ? 0 : taxAmount - cgstAmount;
    const igstAmount = isInterState ? taxAmount : 0;

    return {
      description: item.product?.description ?? '—',
      hsnSac: item.product?.hsnCode ?? '—',
      qty: formatDocumentMoney(Number(item.quantity)),
      unitPrice: formatDocumentAmount(Number(item.unitPrice)),
      cgstPercent: formatGstPercent(cgstRate),
      cgstAmount: formatGstAmount(cgstAmount),
      sgstPercent: formatGstPercent(sgstRate),
      sgstAmount: formatGstAmount(sgstAmount),
      igstPercent: formatGstPercent(igstRate),
      igstAmount: formatGstAmount(igstAmount),
      amount: formatDocumentAmount(lineBase),
    };
  });

  const subtotal = Number(order.subtotalBeforeTax ?? 0) ||
    order.items.reduce((sum, item) => sum + Number(item.lineValue) - Number(item.taxAmount), 0);
  const discount = Number(order.discountAmount);
  const tax = Number(order.taxAmount);
  const storedTotal = order.totalValue != null ? Number(order.totalValue) : null;
  const computedTotal = subtotal - discount + tax;
  const grandTotal = storedTotal != null && storedTotal > 0 ? storedTotal : computedTotal;

  const cgstTotal = Number(order.totalCgst ?? 0) || (isInterState ? 0 : tax / 2);
  const sgstTotal = Number(order.totalSgst ?? 0) || (isInterState ? 0 : tax / 2);
  const igstTotal = Number(order.totalIgst ?? 0) || (isInterState ? tax : 0);

  const dominantIntra = order.items.find(
    (item) => Number(item.cgstRate) > 0 || Number(item.sgstRate) > 0,
  );
  const dominantInter = order.items.find((item) => Number(item.igstRate) > 0);
  const halfRate = dominantIntra
    ? (Number(dominantIntra.cgstRate) + Number(dominantIntra.sgstRate)) / 2
    : 0;
  const igstRateDominant = dominantInter ? Number(dominantInter.igstRate) : 0;

  const generatedAt = formatDocumentDateTime(new Date());
  const generatedBy = order.createdBy?.name ?? 'Retail IMS';

  return {
    documentTitle: 'SALES ORDER',
    documentNumber: order.soNumber,
    documentDate: formatDocumentDate(order.orderDate),
    terms: parsedRemarks.paymentTerms,
    customerPoNumber: parsedRemarks.customerPoNumber ?? order.salesQuotation?.quoteNumber,
    placeOfSupply: order.customer ? placeOfSupplyFromCustomer(order.customer) : undefined,
    supplyTypeLabel: isInterState ? 'Inter-state supply (IGST)' : 'Intra-state supply (CGST + SGST)',
    isInterState,
    companyName: ctx.companyName,
    companyLines: ctx.companyLines,
    partyName: order.customer?.customerName ?? '—',
    partyLines: order.customer ? customerPartyLines(order.customer) : [],
    subject: parsedRemarks.subject,
    lines,
    padRowCount: Math.max(0, MIN_ROWS - lines.length),
    subtotal: formatDocumentAmount(subtotal - discount),
    cgstTotal: formatDocumentAmount(cgstTotal),
    sgstTotal: formatDocumentAmount(sgstTotal),
    igstTotal: formatDocumentAmount(igstTotal),
    cgstRateLabel: halfRate > 0 ? `CGST ${formatDocumentMoney(halfRate)}%` : 'CGST',
    sgstRateLabel: halfRate > 0 ? `SGST ${formatDocumentMoney(halfRate)}%` : 'SGST',
    igstRateLabel: igstRateDominant > 0 ? `IGST ${formatDocumentMoney(igstRateDominant)}%` : 'IGST',
    totalDue: formatDocumentAmount(grandTotal),
    totalInWords: amountInIndianWords(grandTotal),
    notes: parsedRemarks.notes,
    termsAndConditions: parsedRemarks.paymentTerms
      ? `1. Payment is ${parsedRemarks.paymentTerms.toLowerCase()}`
      : undefined,
    generatedAt,
    generatedBy,
    footerNote: `Generated on ${generatedAt} by ${generatedBy} | SO ${order.soNumber}`,
  };
}

export function salesOrderPdfFilename(soNumber: string): string {
  return documentPdfFilename('sales-order', soNumber);
}

export function renderSalesOrderHtml(viewModel: GstSalesDocumentViewModel): string {
  return buildGstSalesDocumentHtml(viewModel);
}
