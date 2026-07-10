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
    lineItemTaxes?: Array<{
        productId: string;
        taxPercent: number;
    }>;
};
export declare function parsePoRemarks(remarks?: string | null): {
    humanRemarks: string;
    document: PoDocumentMeta;
};
