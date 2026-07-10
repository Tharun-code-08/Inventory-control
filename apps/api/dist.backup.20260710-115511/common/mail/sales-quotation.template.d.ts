export type SalesQuotationLine = {
    code: string;
    description: string;
    quantity: string;
    uom: string;
    unitPrice: string;
    lineValue: string;
};
export type SalesQuotationEmailContent = {
    customerName: string;
    quoteNumber: string;
    quoteDate: string;
    validUntil: string | null;
    shopName: string;
    remarks: string | null;
    lines: SalesQuotationLine[];
    totalValue: string;
    companyName: string;
    portalUrl?: string | null;
    isRevision?: boolean;
};
export declare function salesQuotationSubject(content: SalesQuotationEmailContent): string;
export declare function salesQuotationPortalCtaHtml(portalUrl: string, isRevision?: boolean): string;
export declare function ensureSalesQuotationPortalCta(html: string, portalUrl: string | null | undefined, isRevision?: boolean): string;
export declare function ensureSalesQuotationPortalText(text: string, portalUrl: string | null | undefined): string;
export declare function salesQuotationText(content: SalesQuotationEmailContent): string;
export declare function salesQuotationHtml(content: SalesQuotationEmailContent): string;
