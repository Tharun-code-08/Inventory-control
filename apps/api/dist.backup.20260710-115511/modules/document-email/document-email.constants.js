"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_KIND_TO_AUDIT_ENTITY = exports.DOCUMENT_KIND_TO_ENTITY = exports.MAX_BACKGROUND_RETRIES = exports.BACKGROUND_RETRY_BASE_MS = exports.PDF_RETRY_DELAY_MS = exports.PDF_IMMEDIATE_RETRIES = exports.DOCUMENT_EMAIL_QUEUE = void 0;
exports.backgroundRetryDelayMs = backgroundRetryDelayMs;
exports.statusToClient = statusToClient;
exports.DOCUMENT_EMAIL_QUEUE = 'document-email';
exports.PDF_IMMEDIATE_RETRIES = 3;
exports.PDF_RETRY_DELAY_MS = 500;
exports.BACKGROUND_RETRY_BASE_MS = 5 * 60 * 1000;
exports.MAX_BACKGROUND_RETRIES = 5;
function backgroundRetryDelayMs(retryCount) {
    return exports.BACKGROUND_RETRY_BASE_MS * Math.max(1, retryCount);
}
exports.DOCUMENT_KIND_TO_ENTITY = {
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
exports.DOCUMENT_KIND_TO_AUDIT_ENTITY = {
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
function statusToClient(status) {
    return status.toLowerCase().replace(/_/g, '_');
}
//# sourceMappingURL=document-email.constants.js.map