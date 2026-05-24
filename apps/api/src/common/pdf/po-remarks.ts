/** Mirrors web `po-document` marker parsing for server-side PDF generation. */
export type PoDocumentMeta = {
  buyerCompanyName?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  vendorCompanyName?: string;
  vendorContact?: string;
  vendorAddress?: string;
  vendorCityStateZip?: string;
  vendorPhone?: string;
  shipToCompany?: string;
  shipToAddress?: string;
  shipToCityStateZip?: string;
  shipToPhone?: string;
  shipToName?: string;
  requisitioner?: string;
  department?: string;
  paymentTerms?: string;
  shippingAmount?: number;
  taxAmount?: number;
  lineItemTaxes?: Array<{ productId: string; taxPercent: number }>;
};

const MARKER = '<!--PO_DOCUMENT:';
const MARKER_END = '-->';

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
