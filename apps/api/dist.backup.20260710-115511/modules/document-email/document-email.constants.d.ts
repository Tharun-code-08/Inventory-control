export declare const DOCUMENT_EMAIL_QUEUE = "document-email";
export declare const PDF_IMMEDIATE_RETRIES = 3;
export declare const PDF_RETRY_DELAY_MS = 500;
export declare const BACKGROUND_RETRY_BASE_MS: number;
export declare const MAX_BACKGROUND_RETRIES = 5;
export declare function backgroundRetryDelayMs(retryCount: number): number;
export declare const DOCUMENT_KIND_TO_ENTITY: Record<string, string>;
export declare const DOCUMENT_KIND_TO_AUDIT_ENTITY: Record<string, string>;
export declare function statusToClient(status: string): string;
