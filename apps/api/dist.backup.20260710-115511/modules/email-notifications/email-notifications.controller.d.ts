import type { RequestUser } from '../../common/types/request-user';
import { PreviewEmailTemplateDto, UpdateEmailNotificationsDto } from './dto/update-email-notifications.dto';
import { EmailNotificationsService } from './email-notifications.service';
export declare class EmailNotificationsController {
    private readonly emailNotifications;
    constructor(emailNotifications: EmailNotificationsService);
    list(user: RequestUser, shopId?: string): Promise<{
        config: {
            templates: {
                rfq_invite: import("./email-notifications.constants").EmailTemplateConfig;
                purchase_order_supplier: import("./email-notifications.constants").EmailTemplateConfig;
                sales_quotation_customer: import("./email-notifications.constants").EmailTemplateConfig;
                supplier_return_notice: import("./email-notifications.constants").EmailTemplateConfig;
                invoice_created: import("./email-notifications.constants").EmailTemplateConfig;
                payment_received: import("./email-notifications.constants").EmailTemplateConfig;
                payment_reminder: import("./email-notifications.constants").EmailTemplateConfig;
                user_invite: import("./email-notifications.constants").EmailTemplateConfig;
                goods_receipt_posted: import("./email-notifications.constants").EmailTemplateConfig;
                sales_order_customer: import("./email-notifications.constants").EmailTemplateConfig;
                supplier_bill_issued: import("./email-notifications.constants").EmailTemplateConfig;
                supplier_payment_recorded: import("./email-notifications.constants").EmailTemplateConfig;
                goods_receipt_supplier: import("./email-notifications.constants").EmailTemplateConfig;
            };
            reminders: {
                paymentReminderEnabled: boolean;
                paymentReminderDaysBefore: number[];
            };
            internalAlerts: {
                lowStock: import("./email-notifications.constants").EmailInternalAlertConfig;
                rfqDeadline: import("./email-notifications.constants").EmailInternalAlertConfig;
                invoiceOverdue: import("./email-notifications.constants").EmailInternalAlertConfig;
                goodsReceiptPosted: import("./email-notifications.constants").EmailInternalAlertConfig;
            };
            isOverride: boolean;
            version: "1.0";
        };
        definitions: import("./email-notifications.constants").EmailTemplateDefinition[];
        sender: {
            configured: boolean;
            from: string;
            replyTo: string;
            bcc: string;
            domainAuthenticated: boolean | null;
            guidance: string;
        };
    }>;
    updateCompanyDefaults(user: RequestUser, dto: UpdateEmailNotificationsDto): Promise<{
        config: {
            templates: {
                rfq_invite: import("./email-notifications.constants").EmailTemplateConfig;
                purchase_order_supplier: import("./email-notifications.constants").EmailTemplateConfig;
                sales_quotation_customer: import("./email-notifications.constants").EmailTemplateConfig;
                supplier_return_notice: import("./email-notifications.constants").EmailTemplateConfig;
                invoice_created: import("./email-notifications.constants").EmailTemplateConfig;
                payment_received: import("./email-notifications.constants").EmailTemplateConfig;
                payment_reminder: import("./email-notifications.constants").EmailTemplateConfig;
                user_invite: import("./email-notifications.constants").EmailTemplateConfig;
                goods_receipt_posted: import("./email-notifications.constants").EmailTemplateConfig;
                sales_order_customer: import("./email-notifications.constants").EmailTemplateConfig;
                supplier_bill_issued: import("./email-notifications.constants").EmailTemplateConfig;
                supplier_payment_recorded: import("./email-notifications.constants").EmailTemplateConfig;
                goods_receipt_supplier: import("./email-notifications.constants").EmailTemplateConfig;
            };
            reminders: {
                paymentReminderEnabled: boolean;
                paymentReminderDaysBefore: number[];
            };
            internalAlerts: {
                lowStock: import("./email-notifications.constants").EmailInternalAlertConfig;
                rfqDeadline: import("./email-notifications.constants").EmailInternalAlertConfig;
                invoiceOverdue: import("./email-notifications.constants").EmailInternalAlertConfig;
                goodsReceiptPosted: import("./email-notifications.constants").EmailInternalAlertConfig;
            };
            isOverride: boolean;
            version: "1.0";
        };
        definitions: import("./email-notifications.constants").EmailTemplateDefinition[];
        sender: {
            configured: boolean;
            from: string;
            replyTo: string;
            bcc: string;
            domainAuthenticated: boolean | null;
            guidance: string;
        };
    }>;
    updateShopOverrides(user: RequestUser, shopId: string, dto: UpdateEmailNotificationsDto): Promise<{
        config: {
            templates: {
                rfq_invite: import("./email-notifications.constants").EmailTemplateConfig;
                purchase_order_supplier: import("./email-notifications.constants").EmailTemplateConfig;
                sales_quotation_customer: import("./email-notifications.constants").EmailTemplateConfig;
                supplier_return_notice: import("./email-notifications.constants").EmailTemplateConfig;
                invoice_created: import("./email-notifications.constants").EmailTemplateConfig;
                payment_received: import("./email-notifications.constants").EmailTemplateConfig;
                payment_reminder: import("./email-notifications.constants").EmailTemplateConfig;
                user_invite: import("./email-notifications.constants").EmailTemplateConfig;
                goods_receipt_posted: import("./email-notifications.constants").EmailTemplateConfig;
                sales_order_customer: import("./email-notifications.constants").EmailTemplateConfig;
                supplier_bill_issued: import("./email-notifications.constants").EmailTemplateConfig;
                supplier_payment_recorded: import("./email-notifications.constants").EmailTemplateConfig;
                goods_receipt_supplier: import("./email-notifications.constants").EmailTemplateConfig;
            };
            reminders: {
                paymentReminderEnabled: boolean;
                paymentReminderDaysBefore: number[];
            };
            internalAlerts: {
                lowStock: import("./email-notifications.constants").EmailInternalAlertConfig;
                rfqDeadline: import("./email-notifications.constants").EmailInternalAlertConfig;
                invoiceOverdue: import("./email-notifications.constants").EmailInternalAlertConfig;
                goodsReceiptPosted: import("./email-notifications.constants").EmailInternalAlertConfig;
            };
            isOverride: boolean;
            version: "1.0";
        };
        definitions: import("./email-notifications.constants").EmailTemplateDefinition[];
        sender: {
            configured: boolean;
            from: string;
            replyTo: string;
            bcc: string;
            domainAuthenticated: boolean | null;
            guidance: string;
        };
    }>;
    preview(user: RequestUser, dto: PreviewEmailTemplateDto): {
        subject: string;
        text: string;
        html: string;
    };
}
