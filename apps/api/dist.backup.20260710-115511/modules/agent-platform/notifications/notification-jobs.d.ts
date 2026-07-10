export type NotificationJob = DailySummaryJob | LowStockAlertJob | OverduePaymentJob;
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
export declare const NOTIFICATION_QUEUE = "agent-notifications";
export declare const DEFAULT_DAILY_SUMMARY_CRON = "0 8 * * *";
export declare const DEFAULT_LOW_STOCK_CRON = "0 9 * * *";
export declare const DEFAULT_OVERDUE_PAYMENT_CRON = "0 10 * * 1";
