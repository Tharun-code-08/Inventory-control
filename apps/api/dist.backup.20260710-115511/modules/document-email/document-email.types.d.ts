import type { DocumentEmailStatus, DocumentEmailTrigger } from '@prisma/client';
import type { PurchaseOrderEmailContent } from '../../common/mail/purchase-order-supplier.template';
import type { ReturnNoticeEmailContent } from '../../common/mail/return-notice.template';
import type { SalesQuotationEmailContent } from '../../common/mail/sales-quotation.template';
import type { GoodsReceiptSupplierEmailContent, InvoiceCreatedEmailContent, PaymentReceivedEmailContent, SalesOrderCustomerEmailContent, SupplierBillIssuedEmailContent, SupplierPaymentRecordedEmailContent } from '../../common/mail/transactional-email.templates';
import type { DocumentPdfKind } from '../../common/pdf/document-pdf.types';
export type EmailOverrides = {
    subject: string;
    text: string;
    html: string;
    cc?: string[];
    bcc?: string[];
};
export type PurchaseOrderEmailPayload = {
    kind: 'purchase-order';
    content: PurchaseOrderEmailContent;
    overrides: EmailOverrides;
};
export type InvoiceEmailPayload = {
    kind: 'invoice';
    content: InvoiceCreatedEmailContent;
    overrides: EmailOverrides;
};
export type PaymentEmailPayload = {
    kind: 'payment';
    content: PaymentReceivedEmailContent;
    overrides: EmailOverrides;
};
export type SalesOrderEmailPayload = {
    kind: 'sales-order';
    content: SalesOrderCustomerEmailContent;
    overrides: EmailOverrides;
};
export type SupplierBillEmailPayload = {
    kind: 'supplier-bill';
    content: SupplierBillIssuedEmailContent;
    overrides: EmailOverrides;
};
export type SupplierPaymentEmailPayload = {
    kind: 'supplier-payment';
    content: SupplierPaymentRecordedEmailContent;
    overrides: EmailOverrides;
};
export type GoodsReceiptEmailPayload = {
    kind: 'goods-receipt';
    content: GoodsReceiptSupplierEmailContent;
    overrides: EmailOverrides;
};
export type SalesQuotationEmailPayload = {
    kind: 'sales-quotation';
    content: SalesQuotationEmailContent;
    overrides: EmailOverrides;
};
export type GoodsReturnEmailPayload = {
    kind: 'goods-return';
    content: ReturnNoticeEmailContent;
    overrides: EmailOverrides;
    cc?: string;
};
export type DocumentEmailPayload = PurchaseOrderEmailPayload | InvoiceEmailPayload | PaymentEmailPayload | SalesOrderEmailPayload | SupplierBillEmailPayload | SupplierPaymentEmailPayload | GoodsReceiptEmailPayload | SalesQuotationEmailPayload | GoodsReturnEmailPayload;
export type DocumentEmailHistoryRow = {
    id: string;
    entityType: string;
    entityId: string;
    documentNumber: string;
    templateId: string;
    recipient: string;
    attachmentFilename: string | null;
    status: DocumentEmailStatus;
    trigger: DocumentEmailTrigger;
    attempts: number;
    retryCount: number;
    lastError: string | null;
    nextRetryAt: string | null;
    sentAt: string | null;
    createdAt: string;
};
export type DocumentEmailSummary = {
    emailStatus: string;
    lastRecipient: string | null;
    lastSentAt: string | null;
    lastAttachment: string | null;
    retryCount: number;
    lastError: string | null;
};
export type DocumentEmailSendResult = {
    sent: boolean;
    queued?: boolean;
    to: string;
    attachment: string | null;
    pdfAttached: boolean;
    emailStatus: string;
    outboxId?: string;
    message?: string;
};
export declare function kindToEntityType(kind: DocumentPdfKind): string;
