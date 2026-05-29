export const DOCUMENT_EMAIL_QUEUE = 'document-email';

export const PDF_IMMEDIATE_RETRIES = 3;
export const PDF_RETRY_DELAY_MS = 500;
export const BACKGROUND_RETRY_BASE_MS = 5 * 60 * 1000;
export const MAX_BACKGROUND_RETRIES = 5;

export function backgroundRetryDelayMs(retryCount: number): number {
  return BACKGROUND_RETRY_BASE_MS * Math.max(1, retryCount);
}

/** Maps unified document kind to outbox/audit entity type string. */
export const DOCUMENT_KIND_TO_ENTITY: Record<string, string> = {
  'purchase-order': 'purchase-order',
  invoice: 'invoice',
  'sales-order': 'sales-order',
  'goods-receipt': 'goods-receipt',
  'goods-issue': 'goods-issue',
  'goods-return': 'goods-return',
  'supplier-bill': 'supplier-bill',
  'supplier-payment': 'supplier-payment',
  payment: 'payment',
  'sales-quotation': 'sales-quotation',
};

/** Maps to audit_log entityType (uppercase convention). */
export const DOCUMENT_KIND_TO_AUDIT_ENTITY: Record<string, string> = {
  'purchase-order': 'PURCHASE_ORDER',
  invoice: 'INVOICE',
  'sales-order': 'SALES_ORDER',
  'goods-receipt': 'GOODS_RECEIPT',
  'goods-issue': 'GOODS_ISSUE',
  'goods-return': 'GOODS_RETURN',
  'supplier-bill': 'SUPPLIER_BILL',
  'supplier-payment': 'SUPPLIER_PAYMENT',
  payment: 'PAYMENT',
  'sales-quotation': 'SALES_QUOTATION',
};

export function statusToClient(status: string): string {
  return status.toLowerCase().replace(/_/g, '_');
}
