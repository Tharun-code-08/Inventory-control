import type { PrismaService } from '../../prisma/prisma.service';
import { parsePoRemarks } from './po-remarks';
import { formatPoPdfDate, formatPoPdfMoney, type PurchaseOrderPdfData } from './purchase-order-pdf';

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
    orderQty: unknown;
    rate: unknown;
    lineValue: unknown;
    product?: { productCode: string; description: string } | null;
  }>;
};

function splitAddressLines(address?: string | null): string[] {
  if (!address?.trim()) return [];
  return address
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function buildPoPdfDataFromRecord(
  prisma: PrismaService,
  po: PoForPdf,
  companyId: string,
): Promise<PurchaseOrderPdfData> {
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

  const lines = po.items.map((i) => {
    const qty = Number(i.orderQty);
    const rate = Number(i.rate);
    const lineTotal = Number(i.lineValue);
    return {
      code: i.product?.productCode ?? i.productId,
      description: i.product?.description ?? '',
      qty: Number.isInteger(qty) ? String(qty) : formatPoPdfMoney(qty),
      unitPrice: formatPoPdfMoney(rate),
      total: formatPoPdfMoney(lineTotal),
    };
  });

  let vatAmt = Number(document.taxAmount) || 0;
  if (vatAmt === 0 && document.lineItemTaxes?.length) {
    vatAmt = po.items.reduce((sum, item) => {
      const taxPct = document.lineItemTaxes?.find((t) => t.productId === item.productId)?.taxPercent ?? 0;
      const sub = Number(item.orderQty) * Number(item.rate);
      return sum + sub * (taxPct / 100);
    }, 0);
  }
  if (vatAmt === 0) {
    vatAmt = Number(po.taxAmount) || 0;
  }

  const totalNet = po.items.reduce((sum, i) => sum + Number(i.lineValue), 0);
  const deliveryAmt = Number(document.shippingAmount) || 0;
  const grandTotal =
    po.totalValue != null && Number(po.totalValue) > 0
      ? Number(po.totalValue)
      : totalNet + vatAmt + deliveryAmt;

  const minRows = 12;
  const padRowCount = Math.max(0, minRows - lines.length);

  return {
    poNumber: po.poNumber,
    poDate: formatPoPdfDate(po.poDate),
    buyerName,
    buyerLines,
    supplierTitle,
    supplierLines,
    deliveryLines,
    deliveryDate: formatPoPdfDate(po.poDate),
    paymentTerms: document.paymentTerms ?? supplierRow?.paymentTerms ?? '—',
    requestedBy: document.requisitioner ?? '—',
    department: document.department ?? '—',
    lines,
    padRowCount,
    specialInstructions: humanRemarks || '—',
    totalNet: formatPoPdfMoney(totalNet),
    delivery: formatPoPdfMoney(deliveryAmt),
    vat: formatPoPdfMoney(vatAmt),
    grandTotal: formatPoPdfMoney(grandTotal),
  };
}
