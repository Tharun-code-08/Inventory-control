import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service';
import {
  documentPdfFilename,
  formatDocumentCurrency,
  formatDocumentDate,
  formatDocumentMoney,
} from '../document-pdf.formatters';
import {
  buildDocumentLayoutHtml,
  type DocumentLayoutViewModel,
} from '../templates/document-layout.template';
import { customerPartyLines, loadShopCompanyContext } from './shop-company';

const MIN_ROWS = 8;

export async function loadInvoiceForPdf(prisma: PrismaService, id: string) {
  const invoice = await prisma.invoiceHeader.findUnique({
    where: { id },
    include: {
      customer: true,
      salesOrder: {
        select: {
          soNumber: true,
          gstSupplyType: true,
          totalCgst: true,
          totalSgst: true,
          totalIgst: true,
          items: {
            include: {
              product: { select: { productCode: true, description: true, hsnCode: true } },
            },
          },
        },
      },
    },
  });
  if (!invoice) throw new NotFoundException('Invoice not found');
  return invoice;
}

export async function buildInvoicePdfViewModel(
  prisma: PrismaService,
  invoice: Awaited<ReturnType<typeof loadInvoiceForPdf>>,
): Promise<DocumentLayoutViewModel> {
  const ctx = await loadShopCompanyContext(prisma, invoice.shopId);
  const currency = invoice.currency || 'INR';

  const soItems = invoice.salesOrder?.items ?? [];
  const lines =
    soItems.length > 0
      ? soItems.map((item) => {
          const hsn = item.product?.hsnCode?.trim();
          const taxRatePct = Number(item.taxRate) > 0 ? ` (${Number(item.taxRate).toFixed(0)}%)` : '';
          return {
            code: item.product?.productCode ?? item.productId.slice(0, 8),
            description: [
              item.product?.description ?? '—',
              hsn ? `HSN: ${hsn}` : null,
            ].filter(Boolean).join(' | '),
            qty: `${formatDocumentMoney(Number(item.quantity))} ${item.uom}`,
            unitPrice: formatDocumentCurrency(Number(item.unitPrice), currency),
            extra: `${formatDocumentCurrency(Number(item.taxAmount), currency)}${taxRatePct}`,
            amount: formatDocumentCurrency(Number(item.lineValue), currency),
          };
        })
      : [
          {
            code: '—',
            description: 'Invoice total (no line detail)',
            qty: '1',
            unitPrice: formatDocumentCurrency(Number(invoice.totalValue), currency),
            extra: formatDocumentCurrency(Number(invoice.taxAmount), currency),
            amount: formatDocumentCurrency(Number(invoice.totalValue), currency),
          },
        ];

  const subtotal = soItems.length
    ? soItems.reduce((sum, item) => sum + Number(item.lineValue) - Number(item.taxAmount), 0)
    : Number(invoice.totalValue) - Number(invoice.taxAmount);
  const discount = Number(invoice.discountAmount);
  const tax = Number(invoice.taxAmount);
  const grandTotal = Number(invoice.totalValue);
  const paid = Number(invoice.paidValue);
  const balance = Math.max(grandTotal - paid, 0);

  const so = invoice.salesOrder;
  const totalCgst = so ? Number(so.totalCgst) : 0;
  const totalSgst = so ? Number(so.totalSgst) : 0;
  const totalIgst = so ? Number(so.totalIgst) : 0;
  const hasGstSplit = (totalCgst + totalSgst + totalIgst) > 0;

  const gstSupplyType = so?.gstSupplyType ?? 'INTRA_STATE';
  const placeOfSupplyLabel = gstSupplyType === 'INTER_STATE' ? 'Inter-State' : 'Intra-State';

  const metaRows = [
    { label: 'Status', value: invoice.status },
    ...(so ? [{ label: 'Sales Order', value: so.soNumber }] : []),
    ...(invoice.dueDate ? [{ label: 'Due Date', value: formatDocumentDate(invoice.dueDate) }] : []),
    { label: 'Place of Supply', value: placeOfSupplyLabel },
    { label: 'Plant', value: ctx.shopName },
  ];

  return {
    documentTitle: 'TAX INVOICE',
    documentNumber: invoice.invoiceNumber,
    documentDate: formatDocumentDate(invoice.invoiceDate),
    companyName: ctx.companyName,
    companyLines: ctx.companyLines,
    partyLabel: 'Bill To',
    partyName: invoice.customer?.customerName ?? '—',
    partyLines: invoice.customer ? customerPartyLines(invoice.customer) : [],
    metaRows,
    lines,
    showExtraColumn: true,
    extraColumnHeader: 'Tax',
    padRowCount: Math.max(0, MIN_ROWS - lines.length),
    totals: [
      { label: 'Taxable Value', value: formatDocumentCurrency(subtotal, currency) },
      ...(discount > 0
        ? [{ label: 'Discount', value: formatDocumentCurrency(discount, currency) }]
        : []),
      ...(hasGstSplit && totalCgst > 0
        ? [{ label: 'CGST', value: formatDocumentCurrency(totalCgst, currency) }]
        : []),
      ...(hasGstSplit && totalSgst > 0
        ? [{ label: 'SGST', value: formatDocumentCurrency(totalSgst, currency) }]
        : []),
      ...(hasGstSplit && totalIgst > 0
        ? [{ label: 'IGST', value: formatDocumentCurrency(totalIgst, currency) }]
        : []),
      ...(!hasGstSplit
        ? [{ label: 'Tax', value: formatDocumentCurrency(tax, currency) }]
        : []),
      { label: 'Grand Total', value: formatDocumentCurrency(grandTotal, currency), bold: true },
      ...(paid > 0 ? [{ label: 'Paid', value: formatDocumentCurrency(paid, currency) }] : []),
      ...(balance > 0 && paid > 0
        ? [{ label: 'Balance Due', value: formatDocumentCurrency(balance, currency), bold: true }]
        : []),
    ],
    notes: invoice.remarks ?? undefined,
    footerNote: 'This document was generated by SoftdigitIMS.',
  };
}

export function invoicePdfFilename(invoiceNumber: string): string {
  return documentPdfFilename('invoice', invoiceNumber);
}

export function renderInvoiceHtml(viewModel: DocumentLayoutViewModel): string {
  return buildDocumentLayoutHtml(viewModel);
}
