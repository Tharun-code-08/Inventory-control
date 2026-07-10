export type SupplierDeletionEmailContent = {
    supplierName: string;
    supplierCode: string;
    requestedByName: string;
    confirmUrl: string;
    rfqCount: number;
    quotationCount: number;
    contractCount: number;
    purchaseOrderCount: number;
};
export declare function supplierDeletionSubject(supplierName: string): string;
export declare function supplierDeletionText(content: SupplierDeletionEmailContent): string;
export declare function supplierDeletionHtml(content: SupplierDeletionEmailContent): string;
