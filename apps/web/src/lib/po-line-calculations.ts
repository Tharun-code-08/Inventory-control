export type PoLineInput = {
  orderQty?: number | string;
  rate?: number | string;
  taxPercent?: number | string;
};

export function numPo(value: number | string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Per-line amounts: subtotal (qty × rate), tax, and line total including tax. */
export function computePoLineAmounts(line: PoLineInput) {
  const qty = numPo(line.orderQty);
  const rate = numPo(line.rate);
  const taxPercent = Math.max(0, numPo(line.taxPercent));
  const subtotal = qty * rate;
  const taxAmount = subtotal * (taxPercent / 100);
  return {
    subtotal,
    taxPercent,
    taxAmount,
    lineTotal: subtotal + taxAmount,
  };
}

export function sumPoLineTotals(lines: PoLineInput[]) {
  return lines.reduce(
    (acc, line) => {
      const row = computePoLineAmounts(line);
      acc.subtotal += row.subtotal;
      acc.taxTotal += row.taxAmount;
      acc.grandTotal += row.lineTotal;
      return acc;
    },
    { subtotal: 0, taxTotal: 0, grandTotal: 0 },
  );
}

type LineTaxEntry = { productId?: string; lineDescription?: string; lineIndex?: number; taxPercent: number };
type LineRef = { productId?: string | null; lineDescription?: string | null };

function sameLine(entry: LineTaxEntry, line: LineRef): boolean {
  if (entry.productId) return entry.productId === line.productId;
  return Boolean(entry.lineDescription) && entry.lineDescription === (line.lineDescription ?? '').trim();
}

/**
 * Tax % for one PO line. Entries are matched by position first (so the same
 * product on two lines keeps two rates), then by product / service
 * description (older POs stored product id only).
 */
export function taxPercentForLine(
  lineItemTaxes: LineTaxEntry[] | undefined,
  line: LineRef,
  lineIndex: number,
): number {
  if (!lineItemTaxes?.length) return 0;
  const row =
    lineItemTaxes.find((t) => t.lineIndex === lineIndex && sameLine(t, line)) ??
    lineItemTaxes.find((t) => sameLine(t, line));
  return row ? numPo(row.taxPercent) : 0;
}

/** @deprecated Use taxPercentForLine. */
export function taxPercentForProduct(lineItemTaxes: LineTaxEntry[] | undefined, productId: string): number {
  return taxPercentForLine(lineItemTaxes, { productId }, -1);
}
