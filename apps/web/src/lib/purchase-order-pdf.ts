import { jsPDF } from 'jspdf';
import type { PurchaseOrder } from '@/hooks/use-purchase-orders';
import type { PoDocumentMeta } from '@/lib/po-document';
import { computeGstAmounts } from '@/lib/po-form-document';
import { computePoLineAmounts, taxPercentForProduct } from '@/lib/po-line-calculations';

const BLUE: [number, number, number] = [54, 96, 146];
const BLUE_LIGHT: [number, number, number] = [220, 230, 241];
const BORDER: [number, number, number] = [158, 180, 206];
const MUTED: [number, number, number] = [80, 90, 100];

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PAD = 2.5;

function money(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPoDate(iso: string): string {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function drawBar(pdf: jsPDF, x: number, y: number, w: number, label: string): number {
  const h = 5.5;
  pdf.setFillColor(...BLUE);
  pdf.rect(x, y, w, h, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text(label.toUpperCase(), x + PAD, y + 4);
  pdf.setTextColor(0, 0, 0);
  return h;
}

function drawAddressBox(
  pdf: jsPDF,
  lines: string[],
  x: number,
  y: number,
  w: number,
  minH: number,
): number {
  const innerPad = 3;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const parts: string[] = [];
  for (const line of lines.filter(Boolean)) {
    parts.push(...pdf.splitTextToSize(line, w - innerPad * 2));
  }
  if (parts.length === 0) parts.push('—');
  const boxH = Math.max(minH, innerPad * 2 + parts.length * 3.8 + 2);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, w, boxH, 'FD');
  let cy = y + innerPad + 3;
  for (const part of parts) {
    pdf.text(part, x + innerPad, cy);
    cy += 3.8;
  }
  return boxH;
}

export type PoPdfContext = {
  document: PoDocumentMeta;
  buyerCompanyName?: string;
};

export function buildPoPdf(po: PurchaseOrder, ctx: PoPdfContext): jsPDF {
  const doc = ctx.document;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const buyerName = doc.buyerCompanyName || ctx.buyerCompanyName || 'Softdigit Consulting';
  const buyerLines = [
    doc.buyerAddress,
    doc.buyerPhone ? `Tel: ${doc.buyerPhone}` : '',
    doc.buyerWebsite,
  ].filter(Boolean) as string[];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(buyerName, MARGIN, y + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  let by = y + 8;
  for (const line of buyerLines.slice(0, 5)) {
    pdf.text(line, MARGIN, by);
    by += 3.8;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...BLUE);
  pdf.text('PURCHASE ORDER', PAGE_W - MARGIN, y + 6, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Date: ${formatPoDate(po.poDate)}`, PAGE_W - MARGIN, y + 14, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  pdf.text(`PO No.: ${po.poNumber}`, PAGE_W - MARGIN, y + 20, { align: 'right' });
  pdf.setFont('helvetica', 'normal');

  y = Math.max(by, y + 24) + 4;

  const gap = 4;
  const colW = (CONTENT_W - gap) / 2;
  const vendorLines = [
    doc.vendorCompanyName || po.supplier,
    doc.vendorContact,
    doc.vendorAddress,
    doc.vendorCityStateZip,
    doc.vendorPhone ? `Tel: ${doc.vendorPhone}` : '',
  ].filter(Boolean) as string[];

  const plantName = doc.shipToCompany || po.shop?.shopName || '';
  const shipLines = [
    plantName,
    doc.shipToAddress,
    doc.shipToCityStateZip,
    doc.shipToPhone ? `Tel: ${doc.shipToPhone}` : '',
    doc.shipToName && doc.shipToName !== plantName ? `Attn: ${doc.shipToName}` : '',
  ].filter(Boolean) as string[];

  const barH = drawBar(pdf, MARGIN, y, colW, 'Supplier');
  drawBar(pdf, MARGIN + colW + gap, y, colW, 'Delivery Address');
  y += barH;
  const leftH = drawAddressBox(pdf, vendorLines, MARGIN, y, colW, 24);
  const rightH = drawAddressBox(pdf, shipLines, MARGIN + colW + gap, y, colW, 24);
  y += Math.max(leftH, rightH) + 5;

  const metaLabels = ['Delivery Date', 'Payment Terms', 'Requested By', 'Department'];
  const metaValues = [
    formatPoDate(po.poDate),
    doc.paymentTerms ?? '—',
    doc.requisitioner ?? '—',
    doc.department ?? '—',
  ];
  const metaW = (CONTENT_W - 3 * 1.5) / 4;
  metaLabels.forEach((label, i) => {
    const x = MARGIN + i * (metaW + 1.5);
    const h = drawBar(pdf, x, y, metaW, label);
    pdf.setDrawColor(...BORDER);
    pdf.rect(x, y + h, metaW, 8);
    pdf.setFontSize(8);
    pdf.text(metaValues[i] ?? '—', x + PAD, y + h + 5.5);
  });
  y += 5.5 + 8 + 5;

  const cols = [
    { label: 'ITEM', w: 24 },
    { label: 'DESCRIPTION', w: 68 },
    { label: 'QTY', w: 18 },
    { label: 'UNIT PRICE', w: 32 },
    { label: 'TOTAL', w: CONTENT_W - 24 - 68 - 18 - 32 },
  ];
  let cx = MARGIN;
  const hdrH = 5.5;
  pdf.setFillColor(...BLUE_LIGHT);
  pdf.setDrawColor(...BORDER);
  cols.forEach((col) => {
    pdf.rect(cx, y, col.w, hdrH, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(col.label, cx + PAD, y + 4);
    cx += col.w;
  });
  y += hdrH;

  const items = po.items ?? [];
  let subtotal = 0;
  let taxTotal = 0;
  const rowH = 7;
  const minRows = 12;
  const rowCount = Math.max(minRows, items.length);

  for (let i = 0; i < rowCount; i++) {
    const item = items[i];
    cx = MARGIN;
    const colsPos = cols.map((col, idx) => ({
      x: MARGIN + cols.slice(0, idx).reduce((s, c) => s + c.w, 0),
      w: col.w,
    }));
    pdf.setDrawColor(...BORDER);
    colsPos.forEach((col) => pdf.rect(col.x, y, col.w, rowH));
    const baseline = y + 4.8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    if (item) {
      const qty = Number(item.orderQty);
      const rate = Number(item.rate);
      const taxPct = taxPercentForProduct(doc.lineItemTaxes, item.productId);
      const line = computePoLineAmounts({ orderQty: qty, rate, taxPercent: taxPct });
      subtotal += line.subtotal;
      taxTotal += line.taxAmount;

      pdf.text(item.product?.productCode ?? '—', colsPos[0].x + PAD, baseline);
      const desc = item.product?.description ?? '';
      const descWithTax = taxPct > 0 ? `${desc} (Tax ${taxPct}%)` : desc;
      pdf.text(
        pdf.splitTextToSize(descWithTax, cols[1].w - PAD * 2)[0] ?? '',
        colsPos[1].x + PAD,
        baseline,
      );
      pdf.text(String(qty), colsPos[2].x + colsPos[2].w - PAD, baseline, { align: 'right' });
      pdf.text(money(rate), colsPos[3].x + colsPos[3].w - PAD, baseline, { align: 'right' });
      pdf.text(money(line.lineTotal), colsPos[4].x + colsPos[4].w - PAD, baseline, { align: 'right' });
    }
    y += rowH;
  }

  if (taxTotal === 0 && doc.lineItemTaxes?.length) {
    taxTotal = items.reduce((sum, item) => {
      const taxPct = taxPercentForProduct(doc.lineItemTaxes, item.productId);
      const line = computePoLineAmounts({
        orderQty: item.orderQty,
        rate: item.rate,
        taxPercent: taxPct,
      });
      return sum + line.taxAmount;
    }, 0);
    subtotal = items.reduce(
      (sum, item) => sum + computePoLineAmounts({ orderQty: item.orderQty, rate: item.rate }).subtotal,
      0,
    );
  }
  const legacyGst = computeGstAmounts(subtotal, doc);
  if (taxTotal === 0) {
    taxTotal = legacyGst.totalTax > 0 ? legacyGst.totalTax : Number(doc.taxAmount) || 0;
  }
  const shippingAmt = Number(doc.shippingAmount) || 0;
  const grandTotal = subtotal + taxTotal + shippingAmt;

  y += 4;
  const footTop = y;
  const instrW = CONTENT_W * 0.58;
  const totalsW = CONTENT_W - instrW - gap;

  drawBar(pdf, MARGIN, footTop, instrW, 'Special Instructions');
  const humanNote = po.remarks?.split('<!--PO_DOCUMENT')[0]?.trim() || '—';
  const noteH = 28;
  pdf.setDrawColor(...BORDER);
  pdf.rect(MARGIN, footTop + 5.5, instrW, noteH);
  pdf.setFontSize(8.5);
  const noteParts = pdf.splitTextToSize(humanNote, instrW - PAD * 2);
  pdf.text(noteParts.slice(0, 8), MARGIN + PAD, footTop + 10);

  const totalsX = MARGIN + instrW + gap;
  const totalRows = [
    { label: 'TOTAL NET', value: money(subtotal) },
    { label: 'DELIVERY', value: money(shippingAmt) },
    { label: 'GST / TAX', value: taxTotal > 0 ? money(taxTotal) : '0.00' },
    { label: 'TOTAL', value: money(grandTotal), grand: true },
  ];
  let ty = footTop;
  totalRows.forEach((row) => {
    const rh = row.grand ? 8 : 7;
    pdf.setDrawColor(...BORDER);
    if (row.grand) pdf.setFillColor(...BLUE_LIGHT);
    else pdf.setFillColor(255, 255, 255);
    pdf.rect(totalsX, ty, totalsW, rh, 'FD');
    pdf.setFont(row.grand ? 'helvetica' : 'helvetica', row.grand ? 'bold' : 'normal');
    pdf.setFontSize(row.grand ? 10 : 8.5);
    pdf.text(row.label, totalsX + PAD, ty + (row.grand ? 5.5 : 4.8));
    pdf.text(row.value, totalsX + totalsW - PAD, ty + (row.grand ? 5.5 : 4.8), { align: 'right' });
    ty += rh;
  });

  const authY = footTop + 5.5 + noteH + 4;
  drawBar(pdf, MARGIN, authY, 42, 'Authorised');
  pdf.setDrawColor(...BORDER);
  pdf.rect(MARGIN, authY + 5.5, 50, 14);

  return pdf;
}

export function downloadPurchaseOrderPdf(po: PurchaseOrder, ctx: PoPdfContext): void {
  const pdf = buildPoPdf(po, ctx);
  const safeName = po.poNumber.replace(/[^\w-]+/g, '_');
  pdf.save(`${safeName}.pdf`);
}
