import type { Product } from '@/hooks/use-products';

/** A4 is 210mm × 297mm. Each size maps to a label grid that tiles it. */
export const LABEL_SIZES = {
  small: { label: 'Small (50×25mm, 40/page)', w: 50, h: 25, cols: 4, rows: 10, font: 8 },
  medium: { label: 'Medium (65×35mm, 24/page)', w: 65, h: 35, cols: 3, rows: 8, font: 10 },
  large: { label: 'Large (100×60mm, 8/page)', w: 100, h: 60, cols: 2, rows: 4, font: 12 },
} as const;

export type LabelSizeKey = keyof typeof LABEL_SIZES;

export type LabelOptions = {
  size: LabelSizeKey;
  showName: boolean;
  showBarcode: boolean;
  showPrice: boolean;
  showSku: boolean;
};

export type QueueEntry = {
  product: Product;
  quantity: number;
};

export function totalLabels(queue: QueueEntry[]) {
  return queue.reduce((sum, e) => sum + e.quantity, 0);
}

export function labelsPerPage(size: LabelSizeKey) {
  const s = LABEL_SIZES[size];
  return s.cols * s.rows;
}

export function pageCount(queue: QueueEntry[], size: LabelSizeKey) {
  return Math.max(1, Math.ceil(totalLabels(queue) / labelsPerPage(size)));
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function labelCell(
  product: Product,
  barcodeDataUrl: string | undefined,
  opts: LabelOptions,
  formatPrice: (value: number) => string,
) {
  const s = LABEL_SIZES[opts.size];
  const parts: string[] = [];
  if (opts.showName) {
    parts.push(
      `<div style="font-size:${s.font}px;font-weight:600;line-height:1.15;overflow:hidden;max-height:${s.font * 2.4}px;">${escapeHtml(product.description)}</div>`,
    );
  }
  if (opts.showBarcode && barcodeDataUrl) {
    parts.push(
      `<img src="${barcodeDataUrl}" style="width:92%;max-height:${Math.round(s.h * 0.45)}mm;object-fit:contain;"/>`,
    );
  }
  // The barcode image already renders the code as human-readable text, so the
  // SKU line is only added when the barcode itself is hidden.
  if (opts.showSku && !opts.showBarcode) {
    parts.push(`<div style="font-size:${s.font - 1}px;">${escapeHtml(product.productCode)}</div>`);
  }
  if (opts.showPrice) {
    parts.push(
      `<div style="font-size:${s.font + 1}px;font-weight:700;">${escapeHtml(formatPrice(product.sellingPrice))}</div>`,
    );
  }
  return `<div class="label">${parts.join('')}</div>`;
}

/**
 * Build a printable A4 sheet: the queue is flattened (each entry repeated
 * `quantity` times) into a fixed grid; the browser engine paginates
 * automatically because every label has exact mm dimensions.
 */
export function buildSheetHtml(
  queue: QueueEntry[],
  barcodes: Record<string, string>,
  opts: LabelOptions,
  formatPrice: (value: number) => string,
) {
  const s = LABEL_SIZES[opts.size];
  const cells: string[] = [];
  for (const entry of queue) {
    const cell = labelCell(entry.product, barcodes[entry.product.id], opts, formatPrice);
    for (let i = 0; i < entry.quantity; i++) cells.push(cell);
  }

  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: ${(297 - s.h * s.rows) / 2}mm ${(210 - s.w * s.cols) / 2}mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; }
  .sheet { display: flex; flex-wrap: wrap; width: ${s.w * s.cols}mm; }
  .label {
    width: ${s.w}mm;
    height: ${s.h}mm;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 1mm;
    border: 0.2mm dashed #bbb; /* cutting guide */
    page-break-inside: avoid;
  }
</style></head>
<body><div class="sheet">${cells.join('')}</div></body></html>`;
}
