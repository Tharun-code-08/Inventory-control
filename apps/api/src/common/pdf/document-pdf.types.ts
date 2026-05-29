/** Supported document kinds for unified PDF generation. */
export const DOCUMENT_PDF_KINDS = [
  'purchase-order',
  'goods-receipt',
  'goods-return',
  'supplier-bill',
  'supplier-payment',
  'sales-quotation',
  'sales-order',
  'goods-issue',
  'invoice',
  'payment',
] as const;

export type DocumentPdfKind = (typeof DOCUMENT_PDF_KINDS)[number];

export function isDocumentPdfKind(value: string): value is DocumentPdfKind {
  return (DOCUMENT_PDF_KINDS as readonly string[]).includes(value);
}

/** Shared brand tokens for all document PDFs. */
export const DOCUMENT_PDF_BRAND = {
  primary: '#366092',
  primaryLight: '#DCE6F1',
  border: '#9eb4ce',
  text: '#0f172a',
  muted: '#64748b',
} as const;

export type DocumentPdfRenderResult = {
  buffer: Buffer;
  filename: string;
  contentType: 'application/pdf';
};
