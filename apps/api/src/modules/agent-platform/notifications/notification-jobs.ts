/** Discriminated union of all notification job payloads. */
export type NotificationJob =
  | DailySummaryJob
  | LowStockAlertJob
  | OverduePaymentJob;

export type DailySummaryJob = {
  type: 'daily_summary';
  companyId: string;
};

export type LowStockAlertJob = {
  type: 'low_stock_alert';
  companyId: string;
};

export type OverduePaymentJob = {
  type: 'overdue_payment';
  companyId: string;
};

export const NOTIFICATION_QUEUE = 'agent-notifications';

/** Cron expressions — configurable via env with these defaults. */
export const DEFAULT_DAILY_SUMMARY_CRON = '0 8 * * *';     // 08:00 daily
export const DEFAULT_LOW_STOCK_CRON = '0 9 * * *';          // 09:00 daily
export const DEFAULT_OVERDUE_PAYMENT_CRON = '0 10 * * 1';   // 10:00 every Monday
