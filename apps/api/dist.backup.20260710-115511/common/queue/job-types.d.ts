export type DocumentType = 'invoice' | 'purchase-order' | 'goods-receipt' | 'goods-issue' | 'stock-report' | 'inventory-valuation' | 'product-catalog' | 'supplier-report' | 'barcode-label' | 'barcode-batch' | 'barcode-a4-sheet' | 'barcode-thermal';
export declare enum JobStatus {
    QUEUED = "QUEUED",
    PROCESSING = "PROCESSING",
    UPLOADING = "UPLOADING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    EXPIRED = "EXPIRED"
}
export declare enum QueueName {
    PDF_GENERATION = "pdf-generation",
    REPORT_EXPORT = "report-export",
    BARCODE_GENERATION = "barcode-generation"
}
export interface JobPayload {
    tenantId: string;
    userId: string;
    documentType: DocumentType;
    referenceId?: string;
    metadata?: Record<string, any>;
    forceRegenerate?: boolean;
}
export interface JobResult {
    documentId: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
    checksum: string;
    signedUrl: string;
    expiresAt: Date;
}
export interface JobError {
    code: string;
    message: string;
    details?: Record<string, any>;
}
export declare const QUEUE_CONFIG: {
    readonly "pdf-generation": {
        readonly attempts: 3;
        readonly backoff: {
            readonly type: "exponential";
            readonly delay: 5000;
        };
        readonly timeout: 60000;
        readonly removeOnComplete: {
            readonly age: 3600;
        };
        readonly removeOnFail: {
            readonly age: 86400;
        };
    };
    readonly "report-export": {
        readonly attempts: 2;
        readonly backoff: {
            readonly type: "exponential";
            readonly delay: 5000;
        };
        readonly timeout: 300000;
        readonly removeOnComplete: {
            readonly age: 7200;
        };
        readonly removeOnFail: {
            readonly age: 604800;
        };
    };
    readonly "barcode-generation": {
        readonly attempts: 1;
        readonly backoff: undefined;
        readonly timeout: 30000;
        readonly removeOnComplete: {
            readonly age: 1800;
        };
        readonly removeOnFail: {
            readonly age: 86400;
        };
    };
};
export declare function getQueueForDocumentType(documentType: DocumentType): QueueName;
