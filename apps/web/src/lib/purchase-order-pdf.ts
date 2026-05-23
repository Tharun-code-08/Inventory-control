import { jsPDF } from 'jspdf';
import type { PurchaseOrder } from '@/hooks/use-purchase-orders';
import type { PoDocumentMeta } from '@/lib/po-document';
import { computeGstAmounts } from '@/lib/po-form-document';
import { computePoLineAmounts, taxPercentForProduct } from '@/lib/po-line-calculations';

const GREEN: [number, number, number] = [0, 140, 74];
const GREEN_LIGHT: [number, number, number] = [240, 248, 243];
const GREEN_BORDER: [number, number, number] = [210, 225, 215];
const MUTED: [number, number, number] = [100, 116, 125];
const YELLOW: [number, number, number] = [255, 236, 140];

const MARGIN = 12;
const INNER = 16;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - INNER * 2;
const PAD = 3;

/** Helvetica lacks ₹; use Rs. + Indian grouping for clean PDF output. */
function money(value: number): string {
  const n = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `Rs. ${n}`;
}

function formatPoDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function drawSectionHeader(pdf: jsPDF, x: number, y: number, w: number, label: string) {
  const h = 6;
  pdf.setFillColor(...GREEN);
  pdf.rect(x, y, w, h, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text(label.toUpperCase(), x + PAD, y + 4.2);
  pdf.setTextColor(30, 30, 30);
  return h;
}

function drawBoxContent(
  pdf: jsPDF,
  lines: string[],
  x: number,
  y: number,
  w: number,
  minH: number,
): number {
  const innerPad = 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  const usable = lines.filter(Boolean);

  const textLines: string[] = [];
  if (usable.length === 0) {
    textLines.push('Not specified');
  } else {
    for (const line of usable) {
      textLines.push(...pdf.splitTextToSize(line, w - innerPad * 2));
    }
  }

  const boxH = Math.max(minH, innerPad * 2 + textLines.length * 4 + 2);
  pdf.setDrawColor(...GREEN_BORDER);
  pdf.setLineWidth(0.25);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, w, boxH, 'FD');

  let cy = y + innerPad + 3;
  if (usable.length === 0) pdf.setTextColor(...MUTED);
  else pdf.setTextColor(30, 30, 30);
  for (const part of textLines) {
    pdf.text(part, x + innerPad, cy);
    cy += 4;
  }
  return boxH;
}

function drawCellRow(
  pdf: jsPDF,
  y: number,
  rowH: number,
  cols: Array<{ x: number; w: number }>,
  fill?: boolean,
) {
  pdf.setDrawColor(...GREEN_BORDER);
  pdf.setLineWidth(0.2);
  if (fill) {
    pdf.setFillColor(...GREEN_LIGHT);
  }
  cols.forEach((col) => {
    if (fill) pdf.rect(col.x, y, col.w, rowH, 'FD');
    else pdf.rect(col.x, y, col.w, rowH);
  });
}

export type PoPdfContext = {
  document: PoDocumentMeta;
  buyerCompanyName?: string;
};

export function buildPoPdf(po: PurchaseOrder, ctx: PoPdfContext): jsPDF {
  const doc = ctx.document;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

  pdf.setDrawColor(...GREEN);
  pdf.setLineWidth(0.45);
  pdf.rect(MARGIN, MARGIN, PAGE_W - MARGIN * 2, 277);

  const headerBottom = INNER + 34;
  let y = INNER + 2;

  // ---- Header: fixed two-column band (prevents PO# overlapping boxes) ----
  const buyerName = doc.buyerCompanyName || ctx.buyerCompanyName || 'Retail IMS';
  const rightX = INNER + CONTENT_W * 0.52;

  pdf.setFillColor(...GREEN);
  pdf.roundedRect(INNER, y + 1, 9, 9, 1.5, 1.5, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(INNER + 2.5, y + 3, 4, 5, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...GREEN);
  const nameLines = pdf.splitTextToSize(buyerName, rightX - INNER - 14);
  pdf.text(nameLines[0], INNER + 12, y + 6);
  if (nameLines[1]) pdf.text(nameLines[1], INNER + 12, y + 11);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  const buyerMeta = [
    doc.buyerAddress,
    doc.buyerPhone ? `Tel: ${doc.buyerPhone}` : '',
    doc.buyerWebsite,
  ].filter(Boolean) as string[];
  let by = y + (nameLines.length > 1 ? 14 : 10);
  for (const line of buyerMeta.slice(0, 3)) {
    pdf.text(line, INNER + 12, by);
    by += 4;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...GREEN);
  pdf.text('PURCHASE ORDER', PAGE_W - INNER, y + 7, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(50, 50, 50);
  pdf.text(`Date: ${formatPoDate(po.poDate)}`, PAGE_W - INNER, y + 16, { align: 'right' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  const poLabel = `PO #: ${po.poNumber}`;
  const poLines = pdf.splitTextToSize(poLabel, CONTENT_W * 0.46);
  pdf.text(poLines[0], PAGE_W - INNER, y + 22, { align: 'right' });
  if (poLines[1]) {
    pdf.setFontSize(8);
    pdf.text(poLines[1], PAGE_W - INNER, y + 27, { align: 'right' });
  }

  y = headerBottom;

  // ---- Vendor / Ship to ----
  const gap = 5;
  const colW = (CONTENT_W - gap) / 2;
  const vendorLines = [
    doc.vendorCompanyName || po.supplier,
    doc.vendorContact,
    doc.vendorAddress,
    doc.vendorCityStateZip,
    doc.vendorPhone ? `Tel: ${doc.vendorPhone}` : '',
  ].filter(Boolean) as string[];

  const plantName = doc.shipToCompany || po.shop?.shopName;
  const shipLines = [
    plantName,
    doc.shipToAddress,
    doc.shipToCityStateZip,
    doc.shipToPhone ? `Tel: ${doc.shipToPhone}` : '',
    doc.shipToName && doc.shipToName !== plantName ? `Attn: ${doc.shipToName}` : '',
  ].filter(Boolean) as string[];

  const hdrH = drawSectionHeader(pdf, INNER, y, colW, 'Vendor');
  drawSectionHeader(pdf, INNER + colW + gap, y, colW, 'Ship To');
  y += hdrH;

  const leftBoxH = drawBoxContent(pdf, vendorLines, INNER, y, colW, 26);
  const rightBoxH = drawBoxContent(pdf, shipLines, INNER + colW + gap, y, colW, 26);
  y += Math.max(leftBoxH, rightBoxH) + 6;

  // ---- Logistics ----
  const logLabels = ['Requisitioner', 'Ship Via', 'F.O.B.', 'Shipping Terms'];
  const logValues = [
    doc.requisitioner,
    doc.shipVia,
    doc.fob,
    doc.shippingTerms,
  ];
  const logW = (CONTENT_W - 3 * 2) / 4;
  logLabels.forEach((label, i) => {
    const x = INNER + i * (logW + 2);
    const h = drawSectionHeader(pdf, x, y, logW, label);
    pdf.setDrawColor(...GREEN_BORDER);
    pdf.rect(x, y + h, logW, 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(logValues[i] ? 40 : 140, logValues[i] ? 40 : 140, logValues[i] ? 40 : 140);
    const val = logValues[i]?.trim() || '—';
    pdf.text(val, x + PAD, y + h + 6);
    pdf.setTextColor(30, 30, 30);
  });
  y += 6 + 9 + 6;

  // ---- Line items ----
  const cols = [
    { label: 'Item #', w: 22, align: 'left' as const },
    { label: 'Description', w: 48, align: 'left' as const },
    { label: 'Qty', w: 14, align: 'right' as const },
    { label: 'Unit Price', w: 26, align: 'right' as const },
    { label: 'Tax %', w: 16, align: 'right' as const },
    { label: 'Line Total', w: CONTENT_W - 22 - 48 - 14 - 26 - 16, align: 'right' as const },
  ];
  let cx = INNER;
  const tableHdrH = 6;
  cols.forEach((col) => {
    drawSectionHeader(pdf, cx, y, col.w, col.label);
    cx += col.w;
  });
  y += tableHdrH;

  const items = po.items ?? [];
  const fillerRows = items.length > 0 ? Math.min(2, Math.max(0, 4 - items.length)) : 0;
  const rowCount = items.length + fillerRows;
  let subtotal = 0;
  let taxTotal = 0;
  const rowH = 9;

  for (let i = 0; i < rowCount; i++) {
    const item = items[i];
    cx = INNER;
    const colsPos = cols.map((col, idx) => {
      const x = INNER + cols.slice(0, idx).reduce((s, c) => s + c.w, 0);
      return { x, w: col.w };
    });
    drawCellRow(pdf, y, rowH, colsPos, i % 2 === 1 && !item);

    const baseline = y + 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);

    if (item) {
      const qty = Number(item.orderQty);
      const rate = Number(item.rate);
      const taxPct = taxPercentForProduct(doc.lineItemTaxes, item.productId);
      const line = computePoLineAmounts({ orderQty: qty, rate, taxPercent: taxPct });
      subtotal += line.subtotal;
      taxTotal += line.taxAmount;

      pdf.text(item.product?.productCode ?? '—', colsPos[0].x + PAD, baseline);
      const desc = item.product?.description ?? '';
      const descParts = pdf.splitTextToSize(desc, cols[1].w - PAD * 2);
      pdf.text(descParts[0] ?? '', colsPos[1].x + PAD, baseline);

      pdf.text(String(qty), colsPos[2].x + colsPos[2].w - PAD, baseline, { align: 'right' });
      pdf.text(money(rate), colsPos[3].x + colsPos[3].w - PAD, baseline, { align: 'right' });
      pdf.text(taxPct > 0 ? `${taxPct}%` : '—', colsPos[4].x + colsPos[4].w - PAD, baseline, {
        align: 'right',
      });
      pdf.setFont('helvetica', 'bold');
      pdf.text(money(line.lineTotal), colsPos[5].x + colsPos[5].w - PAD, baseline, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
    }

    y += rowH;
  }

  if (taxTotal === 0 && doc.lineItemTaxes?.length) {
    taxTotal = items.reduce((sum, item) => {
      if (!item) return sum;
      const taxPct = taxPercentForProduct(doc.lineItemTaxes, item.productId);
      const line = computePoLineAmounts({
        orderQty: item.orderQty,
        rate: item.rate,
        taxPercent: taxPct,
      });
      return sum + line.taxAmount;
    }, 0);
    subtotal = items.reduce((sum, item) => {
      if (!item) return sum;
      return sum + computePoLineAmounts({ orderQty: item.orderQty, rate: item.rate }).subtotal;
    }, 0);
  }

  const legacyGst = computeGstAmounts(subtotal, doc);
  const legacyTax = Number(doc.taxAmount) || 0;
  if (taxTotal === 0) {
    taxTotal = legacyGst.totalTax > 0 ? legacyGst.totalTax : legacyTax;
  }
  const shippingAmt = Number(doc.shippingAmount) || 0;
  const other = Number(doc.otherAmount) || 0;
  const grandTotal = subtotal + taxTotal + shippingAmt + other;

  y += 5;

  // ---- Comments + totals (aligned tops) ----
  const commentsW = CONTENT_W * 0.54;
  const totalsW = CONTENT_W - commentsW - gap;
  const blockTop = y;

  const cHdr = drawSectionHeader(pdf, INNER, blockTop, commentsW, 'Comments or Special Instructions');
  const humanNote = po.remarks?.split('<!--PO_DOCUMENT')[0]?.trim();

  const totalsX = INNER + commentsW + gap;
  const totalRows: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: 'Subtotal', value: money(subtotal) },
    { label: 'Tax', value: taxTotal > 0 ? money(taxTotal) : '—' },
  ];
  totalRows.push(
    { label: 'Shipping', value: shippingAmt ? money(shippingAmt) : '—' },
    { label: 'Other', value: other ? money(other) : '—' },
    { label: 'TOTAL', value: money(grandTotal), highlight: true },
  );

  const blockH = Math.max(38, 6 + totalRows.length * 7 + 4);
  pdf.setDrawColor(...GREEN_BORDER);
  pdf.rect(INNER, blockTop + cHdr, commentsW, blockH - cHdr);
  if (humanNote) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const noteParts = pdf.splitTextToSize(humanNote, commentsW - PAD * 2);
    pdf.text(noteParts.slice(0, 6), INNER + PAD, blockTop + cHdr + 5);
  }

  let ty = blockTop;
  totalRows.forEach((row) => {
    const rh = row.highlight ? 9 : 7;
    if (row.highlight) {
      pdf.setFillColor(...YELLOW);
      pdf.setDrawColor(...GREEN);
      pdf.setLineWidth(0.3);
      pdf.rect(totalsX, ty, totalsW, rh, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
    } else {
      pdf.setDrawColor(...GREEN_BORDER);
      pdf.setLineWidth(0.2);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(totalsX, ty, totalsW, rh, 'FD');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
    }
    pdf.setTextColor(30, 30, 30);
    const textY = ty + (row.highlight ? 6 : 5);
    pdf.text(row.label, totalsX + PAD, textY);
    pdf.text(row.value, totalsX + totalsW - PAD, textY, { align: 'right' });
    ty += rh;
  });

  y = blockTop + blockH + 8;

  const contact = doc.contactName
    ? `Questions about this order? Contact ${doc.contactName}${
        doc.contactPhone ? ` · ${doc.contactPhone}` : ''
      }${doc.contactEmail ? ` · ${doc.contactEmail}` : ''}`
    : doc.contactEmail
      ? `Questions about this order? ${doc.contactEmail}`
      : 'Questions about this order? Contact your procurement team.';

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  const footer = pdf.splitTextToSize(contact, CONTENT_W - 10);
  pdf.text(footer, PAGE_W / 2, y, { align: 'center' });

  return pdf;
}

export function downloadPurchaseOrderPdf(po: PurchaseOrder, ctx: PoPdfContext): void {
  const pdf = buildPoPdf(po, ctx);
  const safeName = po.poNumber.replace(/[^\w-]+/g, '_');
  pdf.save(`${safeName}.pdf`);
}
