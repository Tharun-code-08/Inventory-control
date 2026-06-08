import type { GstSupplyType } from '@/lib/gst-supply-type';
import { isInterStateSupply } from '@/lib/gst-supply-type';

/** Valid combined GST slabs for intra-state (CGST% + SGST%) or inter-state IGST%. */
export const VALID_GST_SLABS = [0, 5, 12, 18, 28] as const;

/** Preset half-rates shown per CGST/SGST field. */
export const GST_HALF_PRESETS = [0, 2.5, 6, 9, 14] as const;

/** Preset full rates for IGST. */
export const GST_FULL_PRESETS = [...VALID_GST_SLABS] as const;

export type SalesLineGstInput = {
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent?: number;
  supplyType?: GstSupplyType;
};

export type SalesLineGstComputed = {
  taxable: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  lineTotal: number;
  taxRate: number;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function validateGstSlab(cgstPercent: number, sgstPercent: number): string | null {
  if (!Number.isFinite(cgstPercent) || !Number.isFinite(sgstPercent)) {
    return 'CGST and SGST must be valid numbers';
  }
  if (cgstPercent < 0 || sgstPercent < 0) {
    return 'CGST and SGST cannot be negative';
  }
  if (cgstPercent > 14 || sgstPercent > 14) {
    return 'CGST and SGST cannot exceed 14% each';
  }
  const combined = round2(cgstPercent + sgstPercent);
  const valid = VALID_GST_SLABS.some((slab) => Math.abs(slab - combined) < 0.001);
  if (!valid) {
    return `Combined GST must be one of ${VALID_GST_SLABS.join('%, ')}% (got ${combined}%)`;
  }
  return null;
}

export function validateIgstSlab(igstPercent: number): string | null {
  if (!Number.isFinite(igstPercent)) return 'IGST must be a valid number';
  if (igstPercent < 0) return 'IGST cannot be negative';
  if (igstPercent > 28) return 'IGST cannot exceed 28%';
  const valid = VALID_GST_SLABS.some((slab) => Math.abs(slab - igstPercent) < 0.001);
  if (!valid) {
    return `IGST must be one of ${VALID_GST_SLABS.join('%, ')}% (got ${igstPercent}%)`;
  }
  return null;
}

export function validateLineGst(
  supplyType: GstSupplyType,
  cgstPercent: number,
  sgstPercent: number,
  igstPercent: number,
): string | null {
  if (isInterStateSupply(supplyType)) {
    return validateIgstSlab(igstPercent);
  }
  return validateGstSlab(cgstPercent, sgstPercent);
}

export function computeSalesLineGst(input: SalesLineGstInput): SalesLineGstComputed {
  const qty = Number(input.quantity) || 0;
  const rate = Number(input.unitPrice) || 0;
  const discount = Number(input.discountAmount) || 0;
  const supplyType = input.supplyType ?? 'INTRA_STATE';

  const subtotal = round2(qty * rate);
  const taxable = round2(Math.max(subtotal - discount, 0));

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterStateSupply(supplyType)) {
    const igstPercent = Number(input.igstPercent) || 0;
    igstAmount = round2((taxable * igstPercent) / 100);
  } else {
    const cgstPercent = Number(input.cgstPercent) || 0;
    const sgstPercent = Number(input.sgstPercent) || 0;
    cgstAmount = round2((taxable * cgstPercent) / 100);
    sgstAmount = round2((taxable * sgstPercent) / 100);
  }

  const taxAmount = round2(cgstAmount + sgstAmount + igstAmount);
  const lineTotal = round2(taxable + taxAmount);
  const taxRate = isInterStateSupply(supplyType)
    ? (Number(input.igstPercent) || 0) / 100
    : ((Number(input.cgstPercent) || 0) + (Number(input.sgstPercent) || 0)) / 100;

  return { taxable, cgstAmount, sgstAmount, igstAmount, taxAmount, lineTotal, taxRate };
}

export function computeOrderGstTotals(lines: SalesLineGstComputed[]) {
  const subtotalBeforeTax = round2(lines.reduce((sum, line) => sum + line.taxable, 0));
  const totalCgst = round2(lines.reduce((sum, line) => sum + line.cgstAmount, 0));
  const totalSgst = round2(lines.reduce((sum, line) => sum + line.sgstAmount, 0));
  const totalIgst = round2(lines.reduce((sum, line) => sum + line.igstAmount, 0));
  const totalTax = round2(totalCgst + totalSgst + totalIgst);
  const grandTotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  return { subtotalBeforeTax, totalCgst, totalSgst, totalIgst, totalTax, grandTotal };
}

/** Load CGST/SGST from persisted taxRate decimal (intra-state 50/50 split). */
export function splitTaxRateToPercents(taxRate: number): { cgstPercent: number; sgstPercent: number } {
  const combined = round2((Number(taxRate) || 0) * 100);
  const half = round2(combined / 2);
  return { cgstPercent: half, sgstPercent: half };
}

/** Map product combined GST % to line percents for the active supply type. */
export function productGstRateToLinePercents(
  gstRatePercent: number,
  supplyType: GstSupplyType,
): { cgstPercent: number; sgstPercent: number; igstPercent: number } {
  const combined = round2(Number(gstRatePercent) || 0);
  if (combined <= 0) return { cgstPercent: 0, sgstPercent: 0, igstPercent: 0 };
  if (isInterStateSupply(supplyType)) {
    return { cgstPercent: 0, sgstPercent: 0, igstPercent: combined };
  }
  const half = round2(combined / 2);
  return { cgstPercent: half, sgstPercent: half, igstPercent: 0 };
}

/** Re-map line GST percents when supply type changes (e.g. customer GSTIN switch). */
export function convertLinePercentsForSupplyType(
  line: { cgstPercent: string; sgstPercent: string; igstPercent: string },
  supplyType: GstSupplyType,
): { cgstPercent: string; sgstPercent: string; igstPercent: string } {
  const combined = round2(
    Number(line.igstPercent) ||
      Number(line.cgstPercent) + Number(line.sgstPercent) ||
      0,
  );
  const mapped = productGstRateToLinePercents(combined, supplyType);
  return {
    cgstPercent: String(mapped.cgstPercent),
    sgstPercent: String(mapped.sgstPercent),
    igstPercent: String(mapped.igstPercent),
  };
}

