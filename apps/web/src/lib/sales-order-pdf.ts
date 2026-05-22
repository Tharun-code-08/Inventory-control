import { jsPDF } from 'jspdf';
import type { SalesOrder } from '@/hooks/use-sales-orders';
import { formatOrderDate, formatPdfMoney, orderGrandTotal, parseOrderRemarks } from '@/lib/sales-order-doc';

const BRAND_NAME = 'Softdigit Consulting';
const BRAND_ADDRESS = 'Retail operations & technology';
const BLUE: [number, number, number] = [37, 99, 235];
const HEADER_FILL: [number, number, number] = [239, 246, 255];
const BORDER: [number, number, number] = [226, 232, 240];

type PdfLine = {
  productCode: string;
  description: string;
  qtyOrdered: number;
  qtyIssued: number;
  unitPrice: number;
  lineTotal: number;
};

function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: 'S' | 'F' | 'FD',
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

export function downloadSalesOrderPdf(order: SalesOrder) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = pageW - margin * 2;
  const remarks = parseOrderRemarks(order.remarks);
  const plantName = order.shop?.shopName ?? '—';
  const lines: PdfLine[] = (order.items ?? []).map((line) => ({
    productCode: line.product?.productCode ?? '—',
    description: line.product?.description ?? '—',
    qtyOrdered: Number(line.quantity),
    qtyIssued: Number((line as { shippedQty?: number }).shippedQty ?? 0),
    unitPrice: Number(line.unitPrice),
    lineTotal: Number(line.lineValue ?? 0),
  }));
  const grandTotal = orderGrandTotal(order);

  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(BRAND_NAME, margin, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(BRAND_ADDRESS, margin, y);
  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...BLUE);
  const title = 'SALES ORDER';
  const titleW = doc.getTextWidth(title);
  doc.text(title, pageW - margin - titleW, margin + 4);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  const soLabel = order.soNumber;
  const soW = doc.getTextWidth(soLabel);
  doc.text(soLabel, pageW - margin - soW, margin + 24);

  const metaH = 72;
  drawRoundedRect(doc, margin, y, contentW, metaH, 6, 'S');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.75);

  const col1 = margin + 14;
  const col2 = margin + contentW / 2 + 8;
  const row1 = y + 22;
  const row2 = y + 46;

  const label = (text: string, x: number, yy: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(text, x, yy);
  };
  const value = (text: string, x: number, yy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(text, x, yy);
  };

  label('SO NUMBER', col1, row1 - 10);
  value(order.soNumber, col1, row1 + 4);
  label('DATE', col2, row1 - 10);
  value(formatOrderDate(order.orderDate), col2, row1 + 4);
  label('CUSTOMER', col1, row2 - 10);
  value(order.customer?.customerName ?? '—', col1, row2 + 4);
  label('PLANT', col2, row2 - 10);
  value(plantName, col2, row2 + 4);

  y += metaH + 20;

  const colWidths = [72, 148, 56, 56, 72, 72];
  const headers = [
    'PRODUCT ID',
    'PRODUCT DESCRIPTION',
    'QTY ORDERED',
    'QTY ISSUED',
    'UNIT PRICE',
    'AMOUNT',
  ];
  const tableX = margin;
  const headerH = 22;
  const rowH = 28;

  doc.setFillColor(...HEADER_FILL);
  doc.setDrawColor(...BORDER);
  drawRoundedRect(doc, tableX, y, contentW, headerH, 4, 'F');
  doc.rect(tableX, y, contentW, headerH, 'S');

  let cx = tableX;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  headers.forEach((h, i) => {
    doc.text(h, cx + 6, y + 14);
    cx += colWidths[i];
  });

  y += headerH;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  lines.forEach((line, index) => {
    if (y + rowH > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin;
    }
    const rowY = y;
    doc.setDrawColor(...BORDER);
    doc.line(tableX, rowY, tableX + contentW, rowY);
    cx = tableX;
    const cells = [
      line.productCode,
      line.description,
      String(line.qtyOrdered),
      String(line.qtyIssued),
      formatPdfMoney(line.unitPrice),
      formatPdfMoney(line.lineTotal),
    ];
    cells.forEach((cell, i) => {
      const clipped = doc.splitTextToSize(cell, colWidths[i] - 10);
      doc.text(clipped.slice(0, 2), cx + 6, rowY + 16);
      cx += colWidths[i];
    });
    if (index < lines.length - 1) {
      y += rowH;
    } else {
      y += rowH;
    }
  });

  doc.line(tableX, y, tableX + contentW, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const gtLabel = 'Grand Total';
  const gtVal = formatPdfMoney(grandTotal);
  doc.text(gtLabel, tableX + contentW - 160, y + 12);
  doc.setTextColor(...BLUE);
  doc.text(gtVal, tableX + contentW - doc.getTextWidth(gtVal) - 6, y + 12);
  y += 28;

  const notesText =
    remarks.notes ||
    (order.salesQuotation
      ? `Converted from Quotation ${order.salesQuotation.quoteNumber}`
      : '');
  if (notesText) {
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes', margin, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const wrapped = doc.splitTextToSize(notesText, contentW);
    doc.text(wrapped, margin, y + 28);
  }

  doc.save(`${order.soNumber}.pdf`);
}
