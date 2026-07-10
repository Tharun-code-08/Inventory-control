import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import { EmailSenderService } from '../../modules/email-senders/email-sender.service';
import type { SenderSmtpConfig } from '../../modules/email-senders/email-sender.constants';
import { type RfqInviteEmailContent } from './rfq-invite.template';
import { type SalesQuotationEmailContent } from './sales-quotation.template';
import { type PurchaseOrderEmailContent } from './purchase-order-supplier.template';
import { type ReturnNoticeEmailContent } from './return-notice.template';
export type RfqInviteRecipient = {
    supplierId: string;
    supplierName: string;
    email: string;
};
export type RfqInviteEmailResult = {
    supplierId: string;
    supplierName: string;
    email: string;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
    messageId?: string;
};
export type RfqInviteDeliverySummary = {
    configured: boolean;
    sent: number;
    failed: number;
    skipped: number;
    results: RfqInviteEmailResult[];
};
export type EmailDeliveryResult = {
    messageId: string;
    to: string;
    from: string;
    replyTo: string;
    bcc?: string;
};
export declare class MailService implements OnModuleInit {
    private readonly config;
    private readonly emailSenders;
    private readonly logger;
    private transporter;
    private transporterKey;
    private readonly senderTransports;
    private readonly senderTransportKeys;
    constructor(config: ConfigService, emailSenders?: EmailSenderService | null);
    onModuleInit(): void;
    private env;
    smtpHost(): string | undefined;
    isConfigured(): boolean;
    private smtpUser;
    private getFromAddress;
    private isZohoHost;
    private getReplyToAddress;
    private getBccAddress;
    private smtpSettingsKey;
    private getSenderTransport;
    private getTransporter;
    sendMail(args: {
        to: string;
        cc?: string | string[];
        bcc?: string | string[];
        subject: string;
        text: string;
        html: string;
        fromName?: string;
        fromEmail?: string;
        replyTo?: string;
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
        transport?: Transporter;
        envelopeFrom?: string;
    }): Promise<EmailDeliveryResult>;
    sendPlatformMail(args: {
        to: string;
        cc?: string | string[];
        bcc?: string | string[];
        subject: string;
        text: string;
        html: string;
        fromName?: string;
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<EmailDeliveryResult>;
    sendViaSmtp(smtp: SenderSmtpConfig, args: {
        to: string;
        cc?: string | string[];
        bcc?: string | string[];
        subject: string;
        text: string;
        html: string;
        fromName?: string;
        fromEmail: string;
        replyTo?: string;
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
        senderId?: string;
    }): Promise<EmailDeliveryResult>;
    sendTenantMail(companyId: string, args: {
        to: string;
        cc?: string | string[];
        bcc?: string | string[];
        subject: string;
        text: string;
        html: string;
        fromName?: string;
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<EmailDeliveryResult>;
    rfqPortalAccessCode(rfqId: string): string;
    buildRfqInviteContent(args: {
        rfqId: string;
        rfqNumber: string;
        rfqTitle: string;
        deadline?: Date | null;
        supplierName: string;
    }): RfqInviteEmailContent;
    sendRfqInvites(args: {
        companyId: string;
        rfqId: string;
        rfqNumber: string;
        rfqTitle: string;
        deadline?: Date | null;
        recipients: RfqInviteRecipient[];
        shopId?: string | null;
        prepareInvite?: (content: RfqInviteEmailContent) => {
            enabled: false;
        } | {
            enabled: true;
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<RfqInviteDeliverySummary>;
    buildSalesQuotationEmailContent(args: {
        customerName: string;
        quoteNumber: string;
        quoteDate: Date;
        validUntil?: Date | null;
        shopName: string;
        remarks?: string | null;
        totalValue: string | number | {
            toString(): string;
        };
        items: Array<{
            quantity: string | number | {
                toString(): string;
            };
            uom: string;
            unitPrice: string | number | {
                toString(): string;
            };
            lineValue: string | number | {
                toString(): string;
            };
            product: {
                productCode: string;
                description: string;
            };
        }>;
        companyName?: string;
        portalUrl?: string | null;
        isRevision?: boolean;
    }): SalesQuotationEmailContent;
    sendSalesQuotationToCustomer(args: {
        companyId: string;
        to: string;
        content: SalesQuotationEmailContent;
        overrides?: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<EmailDeliveryResult>;
    sendPurchaseOrderToSupplier(args: {
        companyId: string;
        to: string;
        content: PurchaseOrderEmailContent;
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
        overrides?: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
    }): Promise<EmailDeliveryResult>;
    sendSupplierReturnNotice(args: {
        companyId: string;
        to: string;
        cc?: string | string[];
        content: ReturnNoticeEmailContent;
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
        overrides?: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
    }): Promise<EmailDeliveryResult>;
    sendSignupOtp(args: {
        to: string;
        adminName: string;
        companyName: string;
        otpCode: string;
        expiresMinutes: number;
    }): Promise<EmailDeliveryResult>;
    sendPasswordResetOtp(args: {
        to: string;
        userName: string;
        otpCode: string;
        expiresMinutes: number;
    }): Promise<EmailDeliveryResult>;
    sendPasswordResetLink(args: {
        to: string;
        userName: string;
        token: string;
        expiresMinutes: number;
    }): Promise<EmailDeliveryResult>;
    sendInvoiceCreated(args: {
        companyId: string;
        to: string;
        content: import('./transactional-email.templates').InvoiceCreatedEmailContent;
        overrides?: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<EmailDeliveryResult>;
    sendPaymentReceived(args: {
        companyId: string;
        to: string;
        content: import('./transactional-email.templates').PaymentReceivedEmailContent;
        overrides?: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<EmailDeliveryResult>;
    sendSalesOrderToCustomer(args: {
        companyId: string;
        to: string;
        content: import('./transactional-email.templates').SalesOrderCustomerEmailContent;
        overrides?: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<EmailDeliveryResult>;
    sendSupplierBillIssued(args: {
        companyId: string;
        to: string;
        content: import('./transactional-email.templates').SupplierBillIssuedEmailContent;
        overrides?: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<EmailDeliveryResult>;
    sendGoodsReceiptToSupplier(args: {
        companyId: string;
        to: string;
        content: import('./transactional-email.templates').GoodsReceiptSupplierEmailContent;
        overrides?: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<EmailDeliveryResult>;
    sendSupplierPaymentRecorded(args: {
        companyId: string;
        to: string;
        content: import('./transactional-email.templates').SupplierPaymentRecordedEmailContent;
        overrides?: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
        };
        attachments?: Array<{
            filename: string;
            content: Buffer | string;
            contentType?: string;
        }>;
    }): Promise<EmailDeliveryResult>;
    sendSupplierDeletionConfirm(args: {
        adminEmail: string;
        supplierName: string;
        supplierCode: string;
        requestedByName: string;
        confirmToken: string;
        rfqCount: number;
        quotationCount: number;
        contractCount: number;
        purchaseOrderCount: number;
    }): Promise<void>;
}
