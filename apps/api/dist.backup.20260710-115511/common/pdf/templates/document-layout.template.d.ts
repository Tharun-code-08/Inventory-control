export type DocumentLayoutLine = {
    code: string;
    description: string;
    qty: string;
    unitPrice: string;
    amount: string;
    extra?: string;
};
export type DocumentLayoutViewModel = {
    documentTitle: string;
    documentNumber: string;
    documentDate: string;
    companyName: string;
    companyLines: string[];
    brandingLogoUrl?: string | null;
    brandingInitials?: string | null;
    partyLabel: string;
    partyName: string;
    partyLines: string[];
    metaRows: Array<{
        label: string;
        value: string;
    }>;
    lines: DocumentLayoutLine[];
    showExtraColumn: boolean;
    extraColumnHeader: string;
    totals: Array<{
        label: string;
        value: string;
        bold?: boolean;
    }>;
    notes?: string;
    footerNote?: string;
    padRowCount: number;
};
export declare function buildDocumentLayoutHtml(model: DocumentLayoutViewModel): string;
