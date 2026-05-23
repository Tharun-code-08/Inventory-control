/**
 * Purchase order printable document fields stored inside `remarks` as JSON
 * so we don't require a DB migration. Human text stays above the marker.
 */
export type PoDocumentMeta = {
  buyerCompanyName?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerFax?: string;
  buyerWebsite?: string;
  vendorCompanyName?: string;
  vendorContact?: string;
  vendorAddress?: string;
  vendorCityStateZip?: string;
  vendorPhone?: string;
  vendorFax?: string;
  shipToName?: string;
  shipToCompany?: string;
  shipToAddress?: string;
  shipToCityStateZip?: string;
  shipToPhone?: string;
  requisitioner?: string;
  shipVia?: string;
  fob?: string;
  shippingTerms?: string;
  paymentTerms?: string;
  /** Per-line tax % stored by product id (current POs). */
  lineItemTaxes?: Array<{ productId: string; taxPercent: number }>;
  /** @deprecated Legacy header-level tax; kept for older saved POs. */
  taxPercent?: number;
  cgstPercent?: number;
  sgstPercent?: number;
  taxAmount?: number;
  shippingAmount?: number;
  otherAmount?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

const MARKER = '<!--PO_DOCUMENT:';
const MARKER_END = '-->';

export const emptyPoDocument = (): PoDocumentMeta => ({});

export function parsePoRemarks(remarks?: string | null): {
  humanRemarks: string;
  document: PoDocumentMeta;
} {
  if (!remarks?.trim()) {
    return { humanRemarks: '', document: {} };
  }
  const idx = remarks.indexOf(MARKER);
  if (idx === -1) {
    return { humanRemarks: remarks.trim(), document: {} };
  }
  const humanRemarks = remarks.slice(0, idx).trim();
  const jsonPart = remarks.slice(idx + MARKER.length);
  const end = jsonPart.lastIndexOf(MARKER_END);
  const raw = end >= 0 ? jsonPart.slice(0, end) : jsonPart;
  try {
    return { humanRemarks, document: JSON.parse(raw) as PoDocumentMeta };
  } catch {
    return { humanRemarks: remarks.trim(), document: {} };
  }
}

export function encodePoRemarks(humanRemarks: string, document: PoDocumentMeta): string {
  const trimmed = humanRemarks.trim();
  const hasDoc = Object.entries(document).some(([key, v]) => {
    if (key === 'lineItemTaxes') return Array.isArray(v) && v.length > 0;
    return v !== undefined && v !== null && String(v).trim() !== '';
  });
  if (!hasDoc) return trimmed;
  const payload = `${MARKER}${JSON.stringify(document)}${MARKER_END}`;
  return trimmed ? `${trimmed}\n${payload}` : payload;
}

export function mergePoDocument(
  base: PoDocumentMeta,
  override: PoDocumentMeta,
): PoDocumentMeta {
  return { ...base, ...override };
}
