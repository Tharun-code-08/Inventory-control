export type SimpleDocumentPdfData = {
    title: string;
    documentNumber: string;
    documentDate?: string;
    partyLabel: string;
    partyName: string;
    companyName: string;
    summaryLines?: Array<{
        label: string;
        value: string;
    }>;
    tableHeaders?: string[];
    tableRows?: string[][];
    footerNote?: string;
};
export declare function buildSimpleDocumentPrintHtml(data: SimpleDocumentPdfData): string;
export declare function renderSimpleDocumentPdf(data: SimpleDocumentPdfData): Promise<Buffer>;
export declare function documentPdfFilename(prefix: string, number: string): string;
export declare function tryRenderDocumentPdfAttachment(data: SimpleDocumentPdfData, filePrefix: string): Promise<Array<{
    filename: string;
    content: Buffer;
}> | undefined>;
