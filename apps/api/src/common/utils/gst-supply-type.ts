import { GstSupplyType } from '@prisma/client';

/** Extract 2-digit GST state code from a 15-char GSTIN. */
export function gstStateCodeFromTaxId(taxId?: string | null): string | null {
  const trimmed = taxId?.trim().toUpperCase() ?? '';
  if (trimmed.length < 2) return null;
  const code = trimmed.slice(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}

export function resolveGstSupplyType(args: {
  shopTaxId?: string | null;
  customerTaxId?: string | null;
}): GstSupplyType {
  const shopCode = gstStateCodeFromTaxId(args.shopTaxId);
  const customerCode = gstStateCodeFromTaxId(args.customerTaxId);
  if (!shopCode || !customerCode) return GstSupplyType.INTRA_STATE;
  return shopCode !== customerCode ? GstSupplyType.INTER_STATE : GstSupplyType.INTRA_STATE;
}

export function isInterStateSupply(supplyType: GstSupplyType): boolean {
  return supplyType === GstSupplyType.INTER_STATE;
}
