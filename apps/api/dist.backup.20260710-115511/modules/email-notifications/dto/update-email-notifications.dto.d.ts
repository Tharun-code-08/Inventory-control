import { type EmailTemplateId } from '../email-notifications.constants';
export declare class EmailTemplateConfigDto {
    enabled: boolean;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    cc?: string[];
    bcc?: string[];
}
export declare class EmailInternalAlertConfigDto {
    emailEnabled: boolean;
    recipients: string[];
}
export declare class EmailRemindersDto {
    paymentReminderEnabled?: boolean;
    paymentReminderDaysBefore?: number[];
}
export declare class EmailInternalAlertsDto {
    lowStock?: EmailInternalAlertConfigDto;
    rfqDeadline?: EmailInternalAlertConfigDto;
    invoiceOverdue?: EmailInternalAlertConfigDto;
    goodsReceiptPosted?: EmailInternalAlertConfigDto;
}
export declare class UpdateEmailNotificationsDto {
    version?: string;
    templates?: Partial<Record<EmailTemplateId, EmailTemplateConfigDto>>;
    reminders?: EmailRemindersDto;
    internalAlerts?: EmailInternalAlertsDto;
}
export declare class PreviewEmailTemplateDto {
    templateId: EmailTemplateId;
    template?: EmailTemplateConfigDto;
    sampleContext?: Record<string, string>;
}
