import { Prisma } from '@prisma/client';
import { SalesOrdersService } from './sales-orders.service';

/**
 * Direct tests for the private `computeLineTotals` helper. We don't want to
 * spin up a full DI graph just to validate money math, so we cast through the
 * prototype to call the helper with hand-rolled DTO inputs.
 */
type LineTotalsResult = {
  lines: Array<{
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    lineValue: Prisma.Decimal;
  }>;
  total: Prisma.Decimal;
  totalDiscount: Prisma.Decimal;
  totalTax: Prisma.Decimal;
};

function compute(items: any[]): LineTotalsResult {
  const svc = Object.create(SalesOrdersService.prototype) as Record<string, any>;
  return svc.computeLineTotals(items);
}

describe('SalesOrdersService.computeLineTotals', () => {
  it('handles a basic line with zero discount/tax', () => {
    const r = compute([{ productId: 'p', quantity: 3, unitPrice: 10 }]);
    expect(r.lines[0].lineValue.toFixed(2)).toBe('30.00');
    expect(r.total.toFixed(2)).toBe('30.00');
    expect(r.totalDiscount.toFixed(2)).toBe('0.00');
    expect(r.totalTax.toFixed(2)).toBe('0.00');
  });

  it('applies discount before tax', () => {
    // 10 * 5 = 50, discount 10, taxable 40, tax 0.12 * 40 = 4.80, line = 50 - 10 + 4.80 = 44.80
    const r = compute([
      {
        productId: 'p',
        quantity: 10,
        unitPrice: 5,
        discountAmount: 10,
        taxRate: 0.12,
      },
    ]);
    expect(r.lines[0].taxAmount.toFixed(2)).toBe('4.80');
    expect(r.lines[0].lineValue.toFixed(2)).toBe('44.80');
    expect(r.totalTax.toFixed(2)).toBe('4.80');
    expect(r.totalDiscount.toFixed(2)).toBe('10.00');
  });

  it('clamps tax base to zero when discount exceeds subtotal', () => {
    // 1 * 10 = 10, discount 25 -> taxable max(10 - 25, 0) = 0 -> tax 0
    // line = 10 - 25 + 0 = -15, allowed (returns/credit notes)
    const r = compute([
      {
        productId: 'p',
        quantity: 1,
        unitPrice: 10,
        discountAmount: 25,
        taxRate: 0.18,
      },
    ]);
    expect(r.lines[0].taxAmount.toFixed(2)).toBe('0.00');
    expect(r.lines[0].lineValue.toFixed(2)).toBe('-15.00');
  });

  it('rounds half-up to two decimals on tax', () => {
    // 1 * 1.25 = 1.25, tax 0.18 * 1.25 = 0.225 -> 0.23 (HALF-UP)
    const r = compute([
      { productId: 'p', quantity: 1, unitPrice: 1.25, taxRate: 0.18 },
    ]);
    expect(r.lines[0].taxAmount.toFixed(2)).toBe('0.23');
  });

  it('aggregates totals across multiple lines', () => {
    const r = compute([
      { productId: 'a', quantity: 2, unitPrice: 5 },
      { productId: 'b', quantity: 1, unitPrice: 10, discountAmount: 2, taxRate: 0.12 },
    ]);
    // line 1: 10
    // line 2: 10 - 2 + 0.12*8 = 8 + 0.96 = 8.96
    expect(r.total.toFixed(2)).toBe('18.96');
    expect(r.totalDiscount.toFixed(2)).toBe('2.00');
    expect(r.totalTax.toFixed(2)).toBe('0.96');
  });

  it('treats missing items as empty', () => {
    const r = compute(undefined as any);
    expect(r.lines).toHaveLength(0);
    expect(r.total.toFixed(2)).toBe('0.00');
  });
});
