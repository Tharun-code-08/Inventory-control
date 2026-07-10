import { ConfigService } from '@nestjs/config';
import { type TemplateContext } from '../../common/mail/email-template.renderer';
import { MailService } from '../../common/mail/mail.service';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { type EmailNotificationsConfig, type EmailTemplateId } from './email-notifications.constants';
import type { PreviewEmailTemplateDto, UpdateEmailNotificationsDto } from './dto/update-email-notifications.dto';
import type { EmailTemplateConfig } from './email-notifications.constants';
type PreparedEmail = {
    enabled: true;
    subject: string;
    text: string;
    html: string;
    cc?: string[];
    bcc?: string[];
};
export declare class EmailNotificationsService {
    private readonly prisma;
    private readonly mail;
    private readonly config;
    constructor(prisma: PrismaService, mail: MailService, config: ConfigService);
    private assertOrgAdmin;
    private configKey;
    private normalizeConfig;
    getEffectiveConfig(user: RequestUser, shopId?: string | null): Promise<{
        config: {
            templates: {
                rfq_invite: EmailTemplateConfig;
                purchase_order_supplier: EmailTemplateConfig;
                sales_quotation_customer: EmailTemplateConfig;
                supplier_return_notice: EmailTemplateConfig;
                invoice_created: EmailTemplateConfig;
                payment_received: EmailTemplateConfig;
                payment_reminder: EmailTemplateConfig;
                user_invite: EmailTemplateConfig;
                goods_receipt_posted: EmailTemplateConfig;
                sales_order_customer: EmailTemplateConfig;
                supplier_bill_issued: EmailTemplateConfig;
                supplier_payment_recorded: EmailTemplateConfig;
                goods_receipt_supplier: EmailTemplateConfig;
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
    getSenderStatus(): {
        configured: boolean;
        from: string;
        replyTo: string;
        bcc: string;
        domainAuthenticated: boolean | null;
        guidance: string;
    };
    saveCompanyDefaults(user: RequestUser, dto: UpdateEmailNotificationsDto): Promise<{
        config: {
            templates: {
                rfq_invite: EmailTemplateConfig;
                purchase_order_supplier: EmailTemplateConfig;
                sales_quotation_customer: EmailTemplateConfig;
                supplier_return_notice: EmailTemplateConfig;
                invoice_created: EmailTemplateConfig;
                payment_received: EmailTemplateConfig;
                payment_reminder: EmailTemplateConfig;
                user_invite: EmailTemplateConfig;
                goods_receipt_posted: EmailTemplateConfig;
                sales_order_customer: EmailTemplateConfig;
                supplier_bill_issued: EmailTemplateConfig;
                supplier_payment_recorded: EmailTemplateConfig;
                goods_receipt_supplier: EmailTemplateConfig;
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
    saveShopOverrides(user: RequestUser, shopId: string, dto: UpdateEmailNotificationsDto): Promise<{
        config: {
            templates: {
                rfq_invite: EmailTemplateConfig;
                purchase_order_supplier: EmailTemplateConfig;
                sales_quotation_customer: EmailTemplateConfig;
                supplier_return_notice: EmailTemplateConfig;
                invoice_created: EmailTemplateConfig;
                payment_received: EmailTemplateConfig;
                payment_reminder: EmailTemplateConfig;
                user_invite: EmailTemplateConfig;
                goods_receipt_posted: EmailTemplateConfig;
                sales_order_customer: EmailTemplateConfig;
                supplier_bill_issued: EmailTemplateConfig;
                supplier_payment_recorded: EmailTemplateConfig;
                goods_receipt_supplier: EmailTemplateConfig;
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
    previewTemplate(_user: RequestUser, dto: PreviewEmailTemplateDto): {
        subject: string;
        text: string;
        html: string;
    };
    resolveConfigForShop(shopId?: string | null): Promise<EmailNotificationsConfig>;
    prepareTemplate(config: EmailNotificationsConfig, templateId: EmailTemplateId, defaults: {
        subject: string;
        text: string;
        html: string;
    }, context: TemplateContext): PreparedEmail | {
        enabled: false;
    };
    prepareTemplateForShop(shopId: string | null | undefined, templateId: EmailTemplateId, defaults: {
        subject: string;
        text: string;
        html: string;
    }, context: TemplateContext): Promise<PreparedEmail | {
        enabled: false;
    }>;
    hasDeliveryLog(args: {
        templateId: string;
        entityType: string;
        entityId: string;
        recipient: string;
    }): Promise<boolean>;
    logDelivery(args: {
        templateId: string;
        entityType: string;
        entityId: string;
        recipient: string;
    }): Promise<void>;
    resolveInternalRecipients(shopId: string | null | undefined, tokens: string[]): Promise<string[]>;
    sendInternalAlert(args: {
        shopId?: string | null;
        alertKey: keyof EmailNotificationsConfig['internalAlerts'];
        title: string;
        message: string;
        companyName?: string;
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
        dedupe?: {
            templateId: string;
            entityType: string;
            entityId: string;
        };
    }): Promise<{
        sent: number;
        skipped?: undefined;
    } | {
        sent: number;
        skipped: string;
    }>;
}
export {};
