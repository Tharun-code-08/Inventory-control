export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_QUEUE = 'backups';

export type TenantBackupPayload = {
  backupSchemaVersion: number;
  exportedAt: string;
  company: Record<string, unknown>;
  shops: Record<string, unknown>[];
  storageLocations: Record<string, unknown>[];
  suppliers: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  products: Record<string, unknown>[];
  productPlants: Record<string, unknown>[];
  productSpecifications: Record<string, unknown>[];
  stockSummaries: Record<string, unknown>[];
  stockLedgers: Record<string, unknown>[];
  purchaseOrders: Record<string, unknown>[];
  purchaseOrderItems: Record<string, unknown>[];
  goodsReceipts: Record<string, unknown>[];
  goodsReceiptItems: Record<string, unknown>[];
  goodsIssues: Record<string, unknown>[];
  goodsIssueItems: Record<string, unknown>[];
  salesOrders: Record<string, unknown>[];
  salesOrderItems: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  paymentReceipts: Record<string, unknown>[];
};

export type DryRunReport = {
  schemaVersion: number;
  exportedAt: string | null;
  sourceCompanyCode: string | null;
  targetCompanyCode: string;
  counts: Record<string, number>;
  warnings: string[];
  canApply: boolean;
};
