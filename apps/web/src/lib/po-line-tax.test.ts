import { describe, expect, it } from 'vitest';
import { documentFromPoForm } from './po-form-document';
import { taxPercentForLine } from './po-line-calculations';

describe('PO per-line tax', () => {
  const doc = documentFromPoForm({
    items: [
      { productId: 'p1', taxPercent: 5 },
      { productId: 'p1', taxPercent: 18 },
      { lineDescription: 'Installation service', taxPercent: 18 },
    ],
  });

  it('keeps different rates for the same product on two lines', () => {
    expect(taxPercentForLine(doc.lineItemTaxes, { productId: 'p1' }, 0)).toBe(5);
    expect(taxPercentForLine(doc.lineItemTaxes, { productId: 'p1' }, 1)).toBe(18);
  });

  it('stores tax for service lines without a product', () => {
    expect(
      taxPercentForLine(doc.lineItemTaxes, { productId: 'placeholder', lineDescription: 'Installation service' }, 2),
    ).toBe(18);
  });

  it('reads legacy product-keyed entries', () => {
    expect(taxPercentForLine([{ productId: 'p9', taxPercent: 12 }], { productId: 'p9' }, 3)).toBe(12);
  });
});
