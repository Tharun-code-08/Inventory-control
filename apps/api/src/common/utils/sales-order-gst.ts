import { BadRequestException } from '@nestjs/common';
import { GstSupplyType, Prisma } from '@prisma/client';
import { asMoney, roundMoney } from './money';
import { isInterStateSupply } from './gst-supply-type';

export const VALID_GST_SLABS = [0, 5, 12, 18, 28] as const;

export type SalesOrderLineGstInput = {
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  taxRate?: number;
  supplyType?: GstSupplyType;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function validateGstSlab(cgstPercent: number, sgstPercent: number): void {
  if (cgstPercent < 0 || sgstPercent < 0) {
    throw new BadRequestException('CGST and SGST cannot be negative');
  }
  if (cgstPercent > 14 || sgstPercent > 14) {
    throw new BadRequestException('CGST and SGST cannot exceed 14% each');
  }
  const combined = round2(cgstPercent + sgstPercent);
  const valid = VALID_GST_SLABS.some((slab) => Math.abs(slab - combined) < 0.001);
  if (!valid) {
    throw new BadRequestException(
      `Combined GST must be one of ${VALID_GST_SLABS.join('%, ')}% (got ${combined}%)`,
    );
  }
}

export function validateIgstSlab(igstPercent: number): void {
  if (igstPercent < 0) {
    throw new BadRequestException('IGST cannot be negative');
  }
  if (igstPercent > 28) {
    throw new BadRequestException('IGST cannot exceed 28%');
  }
  const valid = VALID_GST_SLABS.some((slab) => Math.abs(slab - igstPercent) < 0.001);
  if (!valid) {
    throw new BadRequestException(
      `IGST must be one of ${VALID_GST_SLABS.join('%, ')}% (got ${igstPercent}%)`,
    );
  }
}

export function resolveLineGstPercents(
  item: SalesOrderLineGstInput,
  supplyType: GstSupplyType = GstSupplyType.INTRA_STATE,
): {
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
} {
  if (isInterStateSupply(supplyType)) {
    if (item.igstRate != null) {
      const igstPercent = round2(Number(item.igstRate));
      validateIgstSlab(igstPercent);
      return { cgstPercent: 0, sgstPercent: 0, igstPercent };
    }
    const combinedPercent = round2((Number(item.taxRate ?? 0)) * 100);
    validateIgstSlab(combinedPercent);
    return { cgstPercent: 0, sgstPercent: 0, igstPercent: combinedPercent };
  }

  if (item.cgstRate != null || item.sgstRate != null) {
    const cgstPercent = round2(Number(item.cgstRate ?? 0));
    const sgstPercent = round2(Number(item.sgstRate ?? 0));
    validateGstSlab(cgstPercent, sgstPercent);
    return { cgstPercent, sgstPercent, igstPercent: 0 };
  }
  const combinedPercent = round2((Number(item.taxRate ?? 0)) * 100);
  const half = round2(combinedPercent / 2);
  validateGstSlab(half, half);
  return { cgstPercent: half, sgstPercent: half, igstPercent: 0 };
}

export function computeSalesOrderLineTotals(
  item: SalesOrderLineGstInput,
  supplyType: GstSupplyType = item.supplyType ?? GstSupplyType.INTRA_STATE,
) {
  const quantity = asMoney(item.quantity ?? 0);
  const unitPrice = asMoney(item.unitPrice ?? 0);
  const discount = asMoney(item.discountAmount ?? 0);
  const { cgstPercent, sgstPercent, igstPercent } = resolveLineGstPercents(item, supplyType);

  const subTotal = quantity.mul(unitPrice);
  const taxable = Prisma.Decimal.max(subTotal.sub(discount), new Prisma.Decimal(0));
  const taxableNum = Number(taxable);

  let cgstAmount = new Prisma.Decimal(0);
  let sgstAmount = new Prisma.Decimal(0);
  let igstAmount = new Prisma.Decimal(0);

  if (isInterStateSupply(supplyType)) {
    igstAmount = roundMoney(new Prisma.Decimal((taxableNum * igstPercent) / 100));
  } else {
    cgstAmount = roundMoney(new Prisma.Decimal((taxableNum * cgstPercent) / 100));
    sgstAmount = roundMoney(new Prisma.Decimal((taxableNum * sgstPercent) / 100));
  }

  const taxAmount = roundMoney(cgstAmount.add(sgstAmount).add(igstAmount));
  const lineValue = roundMoney(subTotal.sub(discount).add(taxAmount));
  const combinedPercent = isInterStateSupply(supplyType)
    ? igstPercent
    : cgstPercent + sgstPercent;
  const taxRate = new Prisma.Decimal(combinedPercent / 100);

  return {
    quantity,
    unitPrice: roundMoney(unitPrice),
    discountAmount: roundMoney(discount),
    cgstRate: new Prisma.Decimal(cgstPercent),
    sgstRate: new Prisma.Decimal(sgstPercent),
    igstRate: new Prisma.Decimal(igstPercent),
    taxRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxAmount,
    lineValue,
    taxable: roundMoney(taxable),
  };
}

/** Split combined product GST % into line fields for a supply type. */
export function productGstRateToLinePercents(
  gstRatePercent: number,
  supplyType: GstSupplyType,
): { cgstPercent: number; sgstPercent: number; igstPercent: number } {
  const combined = round2(Number(gstRatePercent) || 0);
  if (combined <= 0) return { cgstPercent: 0, sgstPercent: 0, igstPercent: 0 };
  if (isInterStateSupply(supplyType)) {
    validateIgstSlab(combined);
    return { cgstPercent: 0, sgstPercent: 0, igstPercent: combined };
  }
  const half = round2(combined / 2);
  validateGstSlab(half, half);
  return { cgstPercent: half, sgstPercent: half, igstPercent: 0 };
}
