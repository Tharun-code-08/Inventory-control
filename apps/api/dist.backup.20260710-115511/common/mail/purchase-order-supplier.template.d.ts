export type PurchaseOrderLine = {
    code: string;
    description: string;
    quantity: string;
    uom: string;
    unitPrice: string;
    lineValue: string;
};
export type PurchaseOrderEmailContent = {
    supplierName: string;
    poNumber: string;
    poDate: string;
    shopName: string;
    remarks: string | null;
    totalValue: string;
    companyName: string;
    lines: PurchaseOrderLine[];
};
export declare function purchaseOrderSubject(content: PurchaseOrderEmailContent): string;
export declare function purchaseOrderText(content: PurchaseOrderEmailContent): string;
export declare function purchaseOrderHtml(content: PurchaseOrderEmailContent): string;
