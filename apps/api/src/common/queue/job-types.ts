export type DocumentType =
  | 'invoice'
  | 'purchase-order'
  | 'goods-receipt'
  | 'goods-issue'
  | 'stock-report'
  | 'inventory-valuation'
  | 'product-catalog'
  | 'supplier-report'
  | 'barcode-label'
  | 'barcode-batch'
  | 'barcode-a4-sheet'
  | 'barcode-thermal';

export enum JobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum QueueName {
  PDF_GENERATION = 'pdf-generation',
  REPORT_EXPORT = 'report-export',
  BARCODE_GENERATION = 'barcode-generation',
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

export const QUEUE_CONFIG = {
  [QueueName.PDF_GENERATION]: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000, // 5 sec base
    },
    timeout: 60000, // 1 min
    removeOnComplete: {
      age: 3600, // Keep 1 hour in completed
    },
    removeOnFail: {
      age: 86400, // Keep 24 hours in failed
    },
  },
  [QueueName.REPORT_EXPORT]: {
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
    timeout: 300000, // 5 min
    removeOnComplete: {
      age: 7200, // Keep 2 hours
    },
    removeOnFail: {
      age: 604800, // Keep 7 days
    },
  },
  [QueueName.BARCODE_GENERATION]: {
    attempts: 1,
    backoff: undefined,
    timeout: 30000, // 30 sec
    removeOnComplete: {
      age: 1800, // Keep 30 min
    },
    removeOnFail: {
      age: 86400, // Keep 24 hours
    },
  },
} as const;

export function getQueueForDocumentType(documentType: DocumentType): QueueName {
  const entityPdfs = ['invoice', 'purchase-order', 'goods-receipt', 'goods-issue'];
  const reportPdfs = ['stock-report', 'inventory-valuation', 'product-catalog', 'supplier-report'];
  const barcodePdfs = ['barcode-label', 'barcode-batch', 'barcode-a4-sheet', 'barcode-thermal'];

  if (entityPdfs.includes(documentType)) return QueueName.PDF_GENERATION;
  if (reportPdfs.includes(documentType)) return QueueName.REPORT_EXPORT;
  if (barcodePdfs.includes(documentType)) return QueueName.BARCODE_GENERATION;

  throw new Error(`Unknown document type: ${documentType}`);
}
