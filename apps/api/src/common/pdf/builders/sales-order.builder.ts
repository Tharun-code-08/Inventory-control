import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service';
import {
  amountInIndianWords,
  documentPdfFilename,
  formatDocumentAmount,
  formatDocumentDate,
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

function splitGstAmounts(taxRate: number, taxAmount: number) {
  const halfRate = taxRate > 0 ? taxRate / 2 : 0;
  const halfAmount = taxAmount / 2;
  return {
    cgstPercent: halfRate > 0 ? `${formatDocumentMoney(halfRate)}%` : '—',
    cgstAmount: taxAmount > 0 ? formatDocumentAmount(halfAmount) : '—',
    sgstPercent: halfRate > 0 ? `${formatDocumentMoney(halfRate)}%` : '—',
    sgstAmount: taxAmount > 0 ? formatDocumentAmount(halfAmount) : '—',
  };
}

export async function loadSalesOrderForPdf(prisma: PrismaService, id: string) {
  const order = await prisma.salesOrderHeader.findUnique({
    where: { id },
    include: {
      customer: true,
      shop: { select: { shopName: true } },
      salesQuotation: { select: { quoteNumber: true } },
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

  const lines = order.items.map((item) => {
    const taxRate = Number(item.taxRate);
    const taxAmount = Number(item.taxAmount);
    const lineBase = Number(item.lineValue) - taxAmount;
    const gst = splitGstAmounts(taxRate, taxAmount);
    return {
      description: item.product?.description ?? '—',
      hsnSac: item.product?.hsnCode ?? '—',
      qty: formatDocumentMoney(Number(item.quantity)),
      unitPrice: formatDocumentAmount(Number(item.unitPrice)),
      ...gst,
      amount: formatDocumentAmount(lineBase),
    };
  });

  const subtotal = order.items.reduce(
    (sum, item) => sum + Number(item.lineValue) - Number(item.taxAmount),
    0,
  );
  const discount = Number(order.discountAmount);
  const tax = Number(order.taxAmount);
  const storedTotal = order.totalValue != null ? Number(order.totalValue) : null;
  const computedTotal = subtotal - discount + tax;
  const grandTotal = storedTotal != null && storedTotal > 0 ? storedTotal : computedTotal;
  const cgstTotal = tax / 2;
  const sgstTotal = tax / 2;
  const dominantRate =
    order.items.find((item) => Number(item.taxRate) > 0)?.taxRate ?? null;
  const halfRate = dominantRate != null ? Number(dominantRate) / 2 : 0;
  const rateLabel = halfRate > 0 ? `CGST ${formatDocumentMoney(halfRate)}%` : 'CGST';

  return {
    documentTitle: 'SALES ORDER',
    documentNumber: order.soNumber,
    documentDate: formatDocumentDate(order.orderDate),
    terms: parsedRemarks.paymentTerms,
    customerPoNumber: parsedRemarks.customerPoNumber ?? order.salesQuotation?.quoteNumber,
    placeOfSupply: order.customer ? placeOfSupplyFromCustomer(order.customer) : undefined,
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
    cgstRateLabel: rateLabel,
    sgstRateLabel: halfRate > 0 ? `SGST ${formatDocumentMoney(halfRate)}%` : 'SGST',
    totalDue: formatDocumentAmount(grandTotal),
    totalInWords: amountInIndianWords(grandTotal),
    notes: parsedRemarks.notes,
    termsAndConditions: parsedRemarks.paymentTerms
      ? `1. Payment is ${parsedRemarks.paymentTerms.toLowerCase()}`
      : undefined,
  };
}

export function salesOrderPdfFilename(soNumber: string): string {
  return documentPdfFilename('sales-order', soNumber);
}

export function renderSalesOrderHtml(viewModel: GstSalesDocumentViewModel): string {
  return buildGstSalesDocumentHtml(viewModel);
}
