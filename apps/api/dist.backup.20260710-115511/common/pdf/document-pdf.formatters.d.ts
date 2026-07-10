export declare function escapeHtml(value: string): string;
export declare function formatDocumentDate(iso: string | Date): string;
export declare function formatDocumentDateTime(iso: string | Date): string;
export declare function formatDocumentMoney(value: number): string;
export declare function formatDocumentCurrency(value: number, currency?: string): string;
export declare function formatDocumentAmount(value: number): string;
export declare function amountInIndianWords(amount: number, currencyLabel?: string): string;
export declare function documentPdfFilename(prefix: string, documentNumber: string): string;
export declare function splitAddressLines(address?: string | null): string[];
