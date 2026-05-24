import { describe, expect, it } from 'vitest';
import { computePoLineAmounts, sumPoLineTotals } from './po-line-calculations';

describe('po-line-calculations', () => {
  it('computes line total from string qty, rate, and tax', () => {
    const row = computePoLineAmounts({ orderQty: '1', rate: '100000', taxPercent: '18' });
    expect(row.subtotal).toBe(100_000);
    expect(row.taxAmount).toBe(18_000);
    expect(row.lineTotal).toBe(118_000);
  });

  it('sums multiple lines', () => {
    const totals = sumPoLineTotals([
      { orderQty: 1, rate: 100, taxPercent: 18 },
      { orderQty: 2, rate: 50, taxPercent: 0 },
    ]);
    expect(totals.grandTotal).toBe(100 * 1.18 + 100);
  });
});
