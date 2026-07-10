export declare const EMAIL_NOTIFICATIONS_CONFIG_PREFIX = "email_notifications_config_v1";
export declare const EMAIL_TEMPLATE_IDS: readonly ["rfq_invite", "purchase_order_supplier", "sales_quotation_customer", "supplier_return_notice", "invoice_created", "payment_received", "payment_reminder", "sales_order_customer", "supplier_bill_issued", "supplier_payment_recorded", "goods_receipt_supplier", "user_invite", "goods_receipt_posted"];
export type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number];
export type EmailTemplateConfig = {
    enabled: boolean;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    cc?: string[];
    bcc?: string[];
};
export type EmailInternalAlertConfig = {
    emailEnabled: boolean;
    recipients: string[];
};
export type EmailNotificationsConfig = {
    version: '1.0';
    templates: Record<EmailTemplateId, EmailTemplateConfig>;
    reminders: {
        paymentReminderEnabled: boolean;
        paymentReminderDaysBefore: number[];
    };
    internalAlerts: {
        lowStock: EmailInternalAlertConfig;
        rfqDeadline: EmailInternalAlertConfig;
        invoiceOverdue: EmailInternalAlertConfig;
        goodsReceiptPosted: EmailInternalAlertConfig;
    };
};
export type EmailTemplateDefinition = {
    id: EmailTemplateId;
    label: string;
    group: 'preferences' | 'procurement' | 'sales' | 'warehouse' | 'system' | 'internal';
    description: string;
    placeholders: string[];
    defaultSubject: string;
    defaultBodyText: string;
    defaultBodyHtml: string;
};
export declare const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[];
export declare function buildDefaultEmailNotificationsConfig(): EmailNotificationsConfig;
export declare function getTemplateDefinition(templateId: EmailTemplateId): EmailTemplateDefinition;
