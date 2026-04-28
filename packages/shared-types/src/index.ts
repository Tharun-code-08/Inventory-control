export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
};

export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
};

export type PaginatedMeta = {
  nextCursor: string | null;
  limit: number;
  hasMore: boolean;
  total?: number;
};

export const REPORT_TYPES = [
  'inventory',
  'low-stock',
  'fast-moving',
  'damaged-stock',
  'gr-register',
  'gi-register',
  'stock-ledger',
  'shop-summary',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];
