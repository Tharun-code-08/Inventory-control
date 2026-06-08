export type GstSupplyType = 'INTRA_STATE' | 'INTER_STATE';

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
  if (!shopCode || !customerCode) return 'INTRA_STATE';
  return shopCode !== customerCode ? 'INTER_STATE' : 'INTRA_STATE';
}

export function isInterStateSupply(supplyType: GstSupplyType): boolean {
  return supplyType === 'INTER_STATE';
}

export function supplyTypeLabel(supplyType: GstSupplyType): string {
  return supplyType === 'INTER_STATE' ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)';
}
