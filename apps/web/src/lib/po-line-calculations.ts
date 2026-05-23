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

export function taxPercentForProduct(
  lineItemTaxes: Array<{ productId: string; taxPercent: number }> | undefined,
  productId: string,
): number {
  if (!lineItemTaxes?.length || !productId) return 0;
  const row = lineItemTaxes.find((t) => t.productId === productId);
  return row ? numPo(row.taxPercent) : 0;
}
