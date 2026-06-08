import { BadRequestException } from '@nestjs/common';
import { GstSupplyType } from '@prisma/client';
import {
  computeSalesOrderLineTotals,
  productGstRateToLinePercents,
  resolveLineGstPercents,
  validateGstSlab,
  validateIgstSlab,
} from './sales-order-gst';

describe('sales-order-gst', () => {
  describe('validateGstSlab', () => {
    it('accepts valid intra-state slabs', () => {
      expect(() => validateGstSlab(9, 9)).not.toThrow();
      expect(() => validateGstSlab(0, 0)).not.toThrow();
      expect(() => validateGstSlab(2.5, 2.5)).not.toThrow();
    });

    it('rejects invalid combined slabs', () => {
      expect(() => validateGstSlab(7, 7)).toThrow(BadRequestException);
    });

    it('rejects rates above 14%', () => {
      expect(() => validateGstSlab(15, 0)).toThrow(BadRequestException);
    });
  });

  describe('validateIgstSlab', () => {
    it('accepts valid IGST slabs', () => {
      expect(() => validateIgstSlab(18)).not.toThrow();
    });

    it('rejects invalid IGST', () => {
      expect(() => validateIgstSlab(7)).toThrow(BadRequestException);
    });
  });

  describe('resolveLineGstPercents', () => {
    it('uses explicit cgst/sgst when provided', () => {
      expect(resolveLineGstPercents({ cgstRate: 9, sgstRate: 9 })).toEqual({
        cgstPercent: 9,
        sgstPercent: 9,
        igstPercent: 0,
      });
    });

    it('uses igst for inter-state', () => {
      expect(
        resolveLineGstPercents({ igstRate: 18 }, GstSupplyType.INTER_STATE),
      ).toEqual({
        cgstPercent: 0,
        sgstPercent: 0,
        igstPercent: 18,
      });
    });

    it('splits legacy taxRate 50/50 intra-state', () => {
      expect(resolveLineGstPercents({ taxRate: 0.18 })).toEqual({
        cgstPercent: 9,
        sgstPercent: 9,
        igstPercent: 0,
      });
    });
  });

  describe('computeSalesOrderLineTotals', () => {
    it('matches client formula for qty 2 @ 100 with 9% CGST/SGST', () => {
      const result = computeSalesOrderLineTotals({
        quantity: 2,
        unitPrice: 100,
        cgstRate: 9,
        sgstRate: 9,
      });
      expect(Number(result.taxable)).toBe(200);
      expect(Number(result.cgstAmount)).toBe(18);
      expect(Number(result.sgstAmount)).toBe(18);
      expect(Number(result.taxAmount)).toBe(36);
      expect(Number(result.lineValue)).toBe(236);
      expect(Number(result.taxRate)).toBeCloseTo(0.18);
    });

    it('computes IGST for inter-state', () => {
      const result = computeSalesOrderLineTotals(
        { quantity: 1, unitPrice: 100, igstRate: 18 },
        GstSupplyType.INTER_STATE,
      );
      expect(Number(result.igstAmount)).toBe(18);
      expect(Number(result.cgstAmount)).toBe(0);
      expect(Number(result.sgstAmount)).toBe(0);
      expect(Number(result.lineValue)).toBe(118);
    });

    it('applies discount before tax', () => {
      const result = computeSalesOrderLineTotals({
        quantity: 1,
        unitPrice: 100,
        discountAmount: 10,
        cgstRate: 9,
        sgstRate: 9,
      });
      expect(Number(result.taxable)).toBe(90);
      expect(Number(result.taxAmount)).toBe(16.2);
      expect(Number(result.lineValue)).toBe(106.2);
    });
  });

  describe('productGstRateToLinePercents', () => {
    it('splits product rate for intra-state', () => {
      expect(productGstRateToLinePercents(18, GstSupplyType.INTRA_STATE)).toEqual({
        cgstPercent: 9,
        sgstPercent: 9,
        igstPercent: 0,
      });
    });

    it('maps full rate to IGST inter-state', () => {
      expect(productGstRateToLinePercents(18, GstSupplyType.INTER_STATE)).toEqual({
        cgstPercent: 0,
        sgstPercent: 0,
        igstPercent: 18,
      });
    });
  });
});
