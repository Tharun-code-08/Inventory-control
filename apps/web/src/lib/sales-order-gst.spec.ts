import { describe, expect, it } from 'vitest';
import {
  computeOrderGstTotals,
  computeSalesLineGst,
  productGstRateToLinePercents,
  splitTaxRateToPercents,
  validateGstSlab,
  validateIgstSlab,
  validateLineGst,
} from './sales-order-gst';

describe('sales-order-gst (web)', () => {
  it('validates GST slabs', () => {
    expect(validateGstSlab(9, 9)).toBeNull();
    expect(validateGstSlab(7, 7)).toMatch(/Combined GST/);
    expect(validateIgstSlab(18)).toBeNull();
    expect(validateIgstSlab(7)).toMatch(/IGST must be/);
  });

  it('validates line GST by supply type', () => {
    expect(validateLineGst('INTRA_STATE', 9, 9, 0)).toBeNull();
    expect(validateLineGst('INTER_STATE', 0, 0, 18)).toBeNull();
  });

  it('computes intra-state line GST aligned with API', () => {
    const line = computeSalesLineGst({
      quantity: 2,
      unitPrice: 100,
      cgstPercent: 9,
      sgstPercent: 9,
      supplyType: 'INTRA_STATE',
    });
    expect(line.taxable).toBe(200);
    expect(line.cgstAmount).toBe(18);
    expect(line.sgstAmount).toBe(18);
    expect(line.taxAmount).toBe(36);
    expect(line.lineTotal).toBe(236);
    expect(line.taxRate).toBeCloseTo(0.18);
  });

  it('computes inter-state IGST', () => {
    const line = computeSalesLineGst({
      quantity: 1,
      unitPrice: 100,
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 18,
      supplyType: 'INTER_STATE',
    });
    expect(line.igstAmount).toBe(18);
    expect(line.lineTotal).toBe(118);
  });

  it('aggregates order totals with IGST', () => {
    const line = computeSalesLineGst({
      quantity: 1,
      unitPrice: 100,
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 18,
      supplyType: 'INTER_STATE',
    });
    const totals = computeOrderGstTotals([line]);
    expect(totals.subtotalBeforeTax).toBe(100);
    expect(totals.totalIgst).toBe(18);
    expect(totals.grandTotal).toBe(118);
  });

  it('splits persisted tax rate into half percents', () => {
    expect(splitTaxRateToPercents(0.18)).toEqual({ cgstPercent: 9, sgstPercent: 9 });
  });

  it('maps product GST rate to line percents', () => {
    expect(productGstRateToLinePercents(18, 'INTRA_STATE')).toEqual({
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 0,
    });
    expect(productGstRateToLinePercents(18, 'INTER_STATE')).toEqual({
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 18,
    });
  });
});
