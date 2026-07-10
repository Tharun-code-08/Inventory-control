export declare const DOCUMENT_PDF_KINDS: readonly ["purchase-order", "goods-receipt", "goods-return", "supplier-bill", "supplier-payment", "sales-quotation", "sales-order", "goods-issue", "invoice", "payment"];
export type DocumentPdfKind = (typeof DOCUMENT_PDF_KINDS)[number];
export declare function isDocumentPdfKind(value: string): value is DocumentPdfKind;
export declare const DOCUMENT_PDF_BRAND: {
    readonly primary: "#366092";
    readonly primaryLight: "#DCE6F1";
    readonly border: "#9eb4ce";
    readonly text: "#0f172a";
    readonly muted: "#64748b";
};
export type DocumentPdfRenderResult = {
    buffer: Buffer;
    filename: string;
    contentType: 'application/pdf';
};
