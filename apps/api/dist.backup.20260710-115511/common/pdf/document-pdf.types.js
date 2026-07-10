"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_PDF_BRAND = exports.DOCUMENT_PDF_KINDS = void 0;
exports.isDocumentPdfKind = isDocumentPdfKind;
exports.DOCUMENT_PDF_KINDS = [
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
];
function isDocumentPdfKind(value) {
    return exports.DOCUMENT_PDF_KINDS.includes(value);
}
exports.DOCUMENT_PDF_BRAND = {
    primary: '#366092',
    primaryLight: '#DCE6F1',
    border: '#9eb4ce',
    text: '#0f172a',
    muted: '#64748b',
};
//# sourceMappingURL=document-pdf.types.js.map