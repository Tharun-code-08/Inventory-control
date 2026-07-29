import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service';
import { parsePoRemarks } from '../po-remarks';
import {
  documentPdfFilename,
  formatDocumentDate,
  formatDocumentMoney,
  splitAddressLines,
} from '../document-pdf.formatters';
import {
  buildPurchaseOrderHtml,
  type PurchaseOrderPdfViewModel,
} from '../templates/purchase-order.template';

type PoForPdf = {
  poNumber: string;
  poDate: Date | string;
  supplier: string;
  shopId: string;
  remarks?: string | null;
  totalValue?: unknown;
  taxAmount?: unknown;
  shop?: { shopName?: string | null } | null;
  items: Array<{
    productId: string;
    lineDescription?: string | null;
    lineCategory?: string | null;
    orderQty: unknown;
    rate: unknown;
    lineValue: unknown;
    product?: { productCode: string; description: string } | null;
  }>;
};

export async function buildPurchaseOrderPdfViewModel(
  prisma: PrismaService,
  po: PoForPdf,
  companyId: string,
): Promise<PurchaseOrderPdfViewModel> {
  const { humanRemarks, document } = parsePoRemarks(po.remarks ?? null);
  const [company, supplierRow, shop] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { companyName: true, address: true },
    }),
    prisma.supplier.findFirst({
      where: {
        companyId,
        supplierName: { equals: po.supplier.trim(), mode: 'insensitive' },
      },
    }),
    prisma.shop.findUnique({
      where: { id: po.shopId },
      select: { shopName: true, address: true, contactPerson: true, mobile: true },
    }),
  ]);

  const buyerName = document.buyerCompanyName ?? company?.companyName ?? 'Softdigit Consulting';
  const buyerLines = [
    ...splitAddressLines(document.buyerAddress ?? company?.address),
    document.buyerPhone ? `Tel: ${document.buyerPhone}` : '',
  ].filter(Boolean);

  const supplierTitle = document.vendorCompanyName ?? supplierRow?.supplierName ?? po.supplier;
  const supplierCity = [supplierRow?.city, supplierRow?.state, supplierRow?.postalCode, supplierRow?.country]
    .filter(Boolean)
    .join(', ');
  const supplierLines = [
    document.vendorContact ?? supplierRow?.contactPerson ?? '',
    document.vendorAddress ?? supplierRow?.street ?? '',
    document.vendorCityStateZip ?? supplierCity,
    document.vendorPhone ?? supplierRow?.phone ? `Tel: ${document.vendorPhone ?? supplierRow?.phone}` : '',
  ].filter(Boolean);

  const plantName = document.shipToCompany ?? shop?.shopName ?? po.shop?.shopName ?? '';
  const deliveryLines = [
    plantName,
    ...splitAddressLines(document.shipToAddress ?? shop?.address),
    document.shipToCityStateZip ?? '',
    document.shipToPhone ?? shop?.mobile ? `Tel: ${document.shipToPhone ?? shop?.mobile}` : '',
    document.shipToName && document.shipToName !== plantName ? `Attn: ${document.shipToName}` : '',
  ].filter(Boolean);

  // Pre-index tax rates by productId so both the lines map and the VAT
  // reduce below are O(1) per item instead of O(n) each → O(n) total.
  const taxByProductId = new Map(
    (document.lineItemTaxes ?? []).map((t) => [t.productId, t.taxPercent]),
  );

  const lines = po.items.map((i) => {
    const qty = Number(i.orderQty);
    const rate = Number(i.rate);
    const taxPercent = taxByProductId.get(i.productId) ?? 0;
    const lineSubtotal = qty * rate;
    const lineTaxAmount = lineSubtotal * (taxPercent / 100);
    const lineTotal = lineSubtotal + lineTaxAmount;
    return {
      code: i.product?.productCode ?? i.productId,
      description: i.lineDescription?.trim() || i.product?.description || '',
      qty: Number.isInteger(qty) ? String(qty) : formatDocumentMoney(qty),
      unitPrice: formatDocumentMoney(rate),
      taxPercent: taxPercent > 0 ? `${formatDocumentMoney(taxPercent)}%` : '0%',
      taxAmount: formatDocumentMoney(lineTaxAmount),
      total: formatDocumentMoney(lineTotal),
    };
  });

  let vatAmt = Number(document.taxAmount) || 0;
  if (vatAmt === 0 && document.lineItemTaxes?.length) {
    vatAmt = po.items.reduce((sum, item) => {
      const taxPct = taxByProductId.get(item.productId) ?? 0;
      const sub = Number(item.orderQty) * Number(item.rate);
      return sum + sub * (taxPct / 100);
    }, 0);
  }
  if (vatAmt === 0) {
    vatAmt = Number(po.taxAmount) || 0;
  }

  const totalNet = po.items.reduce((sum, i) => sum + Number(i.lineValue), 0);
  const deliveryAmt = Number(document.shippingAmount) || 0;
  const storedGrandTotal = Number(po.totalValue) || 0;
  const grandTotal = Math.max(totalNet + vatAmt + deliveryAmt, storedGrandTotal);

  const minRows = 12;
  const padRowCount = Math.max(0, minRows - lines.length);

  return {
    poNumber: po.poNumber,
    poDate: formatDocumentDate(po.poDate),
    buyerName,
    buyerLines,
    supplierTitle,
    supplierLines,
    deliveryLines,
    deliveryDate: formatDocumentDate(po.poDate),
    paymentTerms: document.paymentTerms ?? supplierRow?.paymentTerms ?? '—',
    requestedBy: document.requisitioner ?? '—',
    department: document.department ?? '—',
    lines,
    padRowCount,
    specialInstructions: humanRemarks || '—',
    totalNet: formatDocumentMoney(totalNet),
    delivery: formatDocumentMoney(deliveryAmt),
    taxTotal: formatDocumentMoney(vatAmt),
    grandTotal: formatDocumentMoney(grandTotal),
  };
}

export function purchaseOrderPdfFilename(poNumber: string): string {
  return documentPdfFilename('purchase-order', poNumber);
}

export function renderPurchaseOrderHtml(viewModel: PurchaseOrderPdfViewModel): string {
  return buildPurchaseOrderHtml(viewModel);
}

export async function resolvePurchaseOrderCompanyId(
  prisma: PrismaService,
  shopId: string,
): Promise<string> {
  const shopRow = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { companyId: true },
  });
  if (!shopRow?.companyId) {
    throw new BadRequestException('Shop not linked to a company');
  }
  return shopRow.companyId;
}

export async function loadPurchaseOrderForPdf(prisma: PrismaService, id: string) {
  const po = await prisma.purchaseOrderHeader.findUnique({
    where: { id },
    include: {
      shop: { select: { shopName: true } },
      items: { include: { product: { select: { productCode: true, description: true } } } },
    },
  });
  if (!po) throw new NotFoundException('Purchase order not found');
  return po;
}
