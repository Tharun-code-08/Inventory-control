"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocumentEmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentEmailService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bullmq_2 = require("bullmq");
const document_pdf_service_1 = require("../../common/pdf/document-pdf.service");
const mail_service_1 = require("../../common/mail/mail.service");
const audit_context_1 = require("../../common/utils/audit-context");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const return_image_storage_service_1 = require("../../common/upload/return-image-storage.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const document_email_constants_1 = require("./document-email.constants");
let DocumentEmailService = DocumentEmailService_1 = class DocumentEmailService {
    prisma;
    documentPdf;
    mail;
    emailNotifications;
    audit;
    returnImages;
    queue;
    logger = new common_1.Logger(DocumentEmailService_1.name);
    constructor(prisma, documentPdf, mail, emailNotifications, audit, returnImages, queue) {
        this.prisma = prisma;
        this.documentPdf = documentPdf;
        this.mail = mail;
        this.emailNotifications = emailNotifications;
        this.audit = audit;
        this.returnImages = returnImages;
        this.queue = queue;
    }
    async listHistory(entityType, entityId) {
        const rows = await this.prisma.documentEmailOutbox.findMany({
            where: { entityType, entityId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return rows.map((row) => this.serializeHistoryRow(row));
    }
    async getLatestSummary(entityType, entityId) {
        const row = await this.prisma.documentEmailOutbox.findFirst({
            where: { entityType, entityId },
            orderBy: { createdAt: 'desc' },
        });
        if (!row)
            return null;
        return {
            emailStatus: row.status.toLowerCase(),
            lastRecipient: row.recipient,
            lastSentAt: row.sentAt?.toISOString() ?? null,
            lastAttachment: row.attachmentFilename,
            retryCount: row.retryCount,
            lastError: row.lastError,
        };
    }
    async sendPurchaseOrderEmail(user, args) {
        const payload = {
            kind: 'purchase-order',
            content: args.content,
            overrides: args.prepared,
        };
        return this.enqueueDocumentEmail(user, {
            entityType: 'purchase-order',
            entityId: args.poId,
            documentNumber: args.documentNumber,
            templateId: 'purchase_order_supplier',
            companyId: args.companyId,
            shopId: args.shopId,
            recipient: args.recipient,
            payload,
            trigger: args.trigger,
        }, { asyncOnly: true });
    }
    async sendInvoiceEmail(user, args) {
        return this.enqueueDocumentEmail(user, {
            entityType: 'invoice',
            entityId: args.invoiceId,
            documentNumber: args.documentNumber,
            templateId: 'invoice_created',
            companyId: args.companyId,
            shopId: args.shopId,
            recipient: args.recipient,
            payload: { kind: 'invoice', content: args.content, overrides: args.prepared },
            trigger: args.trigger,
        });
    }
    async sendPaymentEmail(user, args) {
        return this.enqueueDocumentEmail(user, {
            entityType: 'payment',
            entityId: args.paymentId,
            documentNumber: args.documentNumber,
            templateId: 'payment_received',
            companyId: args.companyId,
            shopId: args.shopId,
            recipient: args.recipient,
            payload: { kind: 'payment', content: args.content, overrides: args.prepared },
            trigger: args.trigger,
        });
    }
    async sendSalesOrderEmail(user, args) {
        return this.enqueueDocumentEmail(user, {
            entityType: 'sales-order',
            entityId: args.salesOrderId,
            documentNumber: args.documentNumber,
            templateId: 'sales_order_customer',
            companyId: args.companyId,
            shopId: args.shopId,
            recipient: args.recipient,
            payload: { kind: 'sales-order', content: args.content, overrides: args.prepared },
            trigger: args.trigger,
        });
    }
    async sendSupplierBillEmail(user, args) {
        return this.enqueueDocumentEmail(user, {
            entityType: 'supplier-bill',
            entityId: args.billId,
            documentNumber: args.documentNumber,
            templateId: 'supplier_bill_issued',
            companyId: args.companyId,
            shopId: args.shopId,
            recipient: args.recipient,
            payload: { kind: 'supplier-bill', content: args.content, overrides: args.prepared },
            trigger: args.trigger,
        });
    }
    async sendSupplierPaymentEmail(user, args) {
        return this.enqueueDocumentEmail(user, {
            entityType: 'supplier-payment',
            entityId: args.paymentId,
            documentNumber: args.documentNumber,
            templateId: 'supplier_payment_recorded',
            companyId: args.companyId,
            shopId: args.shopId,
            recipient: args.recipient,
            payload: { kind: 'supplier-payment', content: args.content, overrides: args.prepared },
            trigger: args.trigger,
        });
    }
    async sendGoodsReceiptEmail(user, args) {
        return this.enqueueDocumentEmail(user, {
            entityType: 'goods-receipt',
            entityId: args.grId,
            documentNumber: args.documentNumber,
            templateId: 'goods_receipt_supplier',
            companyId: args.companyId,
            shopId: args.shopId,
            recipient: args.recipient,
            payload: { kind: 'goods-receipt', content: args.content, overrides: args.prepared },
            trigger: args.trigger,
        });
    }
    async sendSalesQuotationEmail(user, args) {
        return this.enqueueDocumentEmail(user, {
            entityType: 'sales-quotation',
            entityId: args.quoteId,
            documentNumber: args.documentNumber,
            templateId: 'sales_quotation_customer',
            companyId: args.companyId,
            shopId: args.shopId,
            recipient: args.recipient,
            payload: { kind: 'sales-quotation', content: args.content, overrides: args.prepared },
            trigger: args.trigger,
        });
    }
    async sendGoodsReturnEmail(user, args) {
        return this.enqueueDocumentEmail(user, {
            entityType: 'goods-return',
            entityId: args.returnId,
            documentNumber: args.documentNumber,
            templateId: 'supplier_return_notice',
            companyId: args.companyId,
            shopId: args.shopId,
            recipient: args.recipient,
            payload: {
                kind: 'goods-return',
                content: args.content,
                overrides: args.prepared,
                cc: args.cc,
            },
            trigger: args.trigger,
        });
    }
    async enqueueDocumentEmail(user, args, options) {
        const outbox = await this.prisma.documentEmailOutbox.create({
            data: {
                entityType: args.entityType,
                entityId: args.entityId,
                documentNumber: args.documentNumber,
                templateId: args.templateId,
                companyId: args.companyId,
                shopId: args.shopId,
                recipient: args.recipient.toLowerCase(),
                status: client_1.DocumentEmailStatus.PENDING_PDF,
                trigger: args.trigger,
                payloadJson: args.payload,
                sentById: user.id,
            },
        });
        if (options?.asyncOnly) {
            await this.queue.add('retry', { outboxId: outbox.id }, {
                jobId: `document-email-${outbox.id}-0`,
                removeOnComplete: true,
                removeOnFail: false,
            });
            return {
                sent: false,
                queued: true,
                to: args.recipient,
                attachment: null,
                pdfAttached: false,
                emailStatus: 'pending_pdf',
                outboxId: outbox.id,
                message: 'Document saved. Supplier email is queued and will be sent automatically with PDF attachment.',
            };
        }
        try {
            return await this.processOutbox(outbox.id, user.id);
        }
        catch (err) {
            const message = err.message ?? 'Email delivery failed';
            await this.scheduleBackgroundRetry(outbox.id, message);
            return {
                sent: false,
                queued: true,
                to: args.recipient,
                attachment: null,
                pdfAttached: false,
                emailStatus: 'pending_pdf',
                outboxId: outbox.id,
                message: 'PDF generation failed and will be retried automatically. Email has not been sent.',
            };
        }
    }
    async processOutbox(outboxId, actorUserId) {
        const row = await this.prisma.documentEmailOutbox.findUnique({ where: { id: outboxId } });
        if (!row) {
            throw new common_1.BadRequestException('Email outbox entry not found');
        }
        if (row.status === client_1.DocumentEmailStatus.SENT || row.status === client_1.DocumentEmailStatus.DELIVERED) {
            return {
                sent: true,
                to: row.recipient,
                attachment: row.attachmentFilename,
                pdfAttached: Boolean(row.attachmentFilename),
                emailStatus: row.status.toLowerCase(),
                outboxId: row.id,
            };
        }
        if (row.status === client_1.DocumentEmailStatus.FAILED) {
            throw new common_1.BadRequestException(row.lastError ?? 'Email delivery failed permanently');
        }
        const userId = actorUserId ?? row.sentById ?? undefined;
        await this.prisma.documentEmailOutbox.update({
            where: { id: outboxId },
            data: { attempts: { increment: 1 } },
        });
        const payload = row.payloadJson;
        let pdfBuffer;
        let pdfFilename;
        try {
            const pdfResult = await this.renderPdfForPayload(payload, row.entityId);
            pdfBuffer = pdfResult.buffer;
            pdfFilename = pdfResult.filename;
        }
        catch (err) {
            const message = err.message ?? 'PDF generation failed';
            await this.prisma.documentEmailOutbox.update({
                where: { id: outboxId },
                data: {
                    status: client_1.DocumentEmailStatus.PENDING_PDF,
                    lastError: message,
                },
            });
            if (userId) {
                await this.writeAudit(userId, row, 'failed', message, payload);
            }
            throw new Error(message, { cause: err });
        }
        await this.prisma.documentEmailOutbox.update({
            where: { id: outboxId },
            data: {
                status: client_1.DocumentEmailStatus.PENDING_SEND,
                attachmentFilename: pdfFilename,
                lastError: null,
            },
        });
        try {
            const extraAttachments = payload.kind === 'goods-return'
                ? await this.loadReturnImageAttachments(row.entityId)
                : [];
            const delivery = await this.sendMailForPayload(payload, row.companyId, row.recipient, pdfBuffer, pdfFilename, extraAttachments);
            await this.prisma.documentEmailOutbox.update({
                where: { id: outboxId },
                data: {
                    status: client_1.DocumentEmailStatus.SENT,
                    sentAt: new Date(),
                    messageId: delivery.messageId,
                    lastError: null,
                    nextRetryAt: null,
                },
            });
            await this.emailNotifications.logDelivery({
                templateId: row.templateId,
                entityType: row.entityType,
                entityId: row.entityId,
                recipient: row.recipient,
            });
            if (userId) {
                await this.writeAudit(userId, row, 'sent', undefined, payload, pdfFilename);
            }
            return {
                sent: true,
                to: row.recipient,
                attachment: pdfFilename,
                pdfAttached: true,
                emailStatus: 'sent',
                outboxId: row.id,
            };
        }
        catch (err) {
            const message = err.message ?? 'Email send failed';
            await this.prisma.documentEmailOutbox.update({
                where: { id: outboxId },
                data: {
                    status: client_1.DocumentEmailStatus.PENDING_SEND,
                    lastError: message,
                },
            });
            if (userId) {
                await this.writeAudit(userId, row, 'failed', message, payload);
            }
            throw new Error(message, { cause: err });
        }
    }
    async scheduleBackgroundRetry(outboxId, lastError) {
        const row = await this.prisma.documentEmailOutbox.findUnique({ where: { id: outboxId } });
        if (!row)
            return;
        const nextRetryCount = row.retryCount + 1;
        if (nextRetryCount > document_email_constants_1.MAX_BACKGROUND_RETRIES) {
            await this.prisma.documentEmailOutbox.update({
                where: { id: outboxId },
                data: {
                    status: client_1.DocumentEmailStatus.FAILED,
                    retryCount: nextRetryCount,
                    lastError,
                    nextRetryAt: null,
                },
            });
            if (row.sentById) {
                const payload = row.payloadJson;
                await this.writeAudit(row.sentById, row, 'failed', lastError, payload);
            }
            this.logger.warn(`Document email ${outboxId} failed permanently after ${nextRetryCount} retries`);
            return;
        }
        const delayMs = (0, document_email_constants_1.backgroundRetryDelayMs)(nextRetryCount);
        const nextRetryAt = new Date(Date.now() + delayMs);
        await this.prisma.documentEmailOutbox.update({
            where: { id: outboxId },
            data: {
                retryCount: nextRetryCount,
                lastError,
                nextRetryAt,
                status: row.status === client_1.DocumentEmailStatus.PENDING_SEND
                    ? client_1.DocumentEmailStatus.PENDING_SEND
                    : client_1.DocumentEmailStatus.PENDING_PDF,
            },
        });
        await this.queue.add('retry', { outboxId }, {
            jobId: `document-email-${outboxId}-${nextRetryCount}`,
            delay: delayMs,
            removeOnComplete: true,
            removeOnFail: false,
        });
        this.logger.log(`Queued document email retry ${outboxId} in ${Math.round(delayMs / 1000)}s (attempt ${nextRetryCount})`);
    }
    async renderPdfForPayload(payload, entityId) {
        switch (payload.kind) {
            case 'purchase-order':
                return this.documentPdf.renderPurchaseOrderPdfByIdWithRetry(entityId, document_email_constants_1.PDF_IMMEDIATE_RETRIES, document_email_constants_1.PDF_RETRY_DELAY_MS);
            case 'invoice':
                return this.documentPdf.renderInvoicePdfByIdWithRetry(entityId, document_email_constants_1.PDF_IMMEDIATE_RETRIES, document_email_constants_1.PDF_RETRY_DELAY_MS);
            case 'payment':
                return this.documentPdf.renderPaymentReceiptPdfByIdWithRetry(entityId, document_email_constants_1.PDF_IMMEDIATE_RETRIES, document_email_constants_1.PDF_RETRY_DELAY_MS);
            case 'sales-order':
                return this.documentPdf.renderSalesOrderPdfByIdWithRetry(entityId, document_email_constants_1.PDF_IMMEDIATE_RETRIES, document_email_constants_1.PDF_RETRY_DELAY_MS);
            case 'supplier-bill':
                return this.documentPdf.renderSupplierBillPdfByIdWithRetry(entityId, document_email_constants_1.PDF_IMMEDIATE_RETRIES, document_email_constants_1.PDF_RETRY_DELAY_MS);
            case 'supplier-payment':
                return this.documentPdf.renderSupplierPaymentPdfByIdWithRetry(entityId, document_email_constants_1.PDF_IMMEDIATE_RETRIES, document_email_constants_1.PDF_RETRY_DELAY_MS);
            case 'goods-receipt':
                return this.documentPdf.renderGoodsReceiptPdfByIdWithRetry(entityId, document_email_constants_1.PDF_IMMEDIATE_RETRIES, document_email_constants_1.PDF_RETRY_DELAY_MS);
            case 'sales-quotation':
                return this.documentPdf.renderSalesQuotationPdfByIdWithRetry(entityId, document_email_constants_1.PDF_IMMEDIATE_RETRIES, document_email_constants_1.PDF_RETRY_DELAY_MS);
            case 'goods-return':
                return this.documentPdf.renderGoodsReturnPdfByIdWithRetry(entityId, document_email_constants_1.PDF_IMMEDIATE_RETRIES, document_email_constants_1.PDF_RETRY_DELAY_MS);
            default:
                throw new common_1.BadRequestException(`Unsupported email payload kind: ${payload.kind}`);
        }
    }
    async loadReturnImageAttachments(entityId) {
        const images = await this.prisma.supplierReturnImage.findMany({
            where: { returnId: entityId },
            orderBy: { createdAt: 'asc' },
        });
        const attachments = [];
        for (const image of images) {
            attachments.push({
                filename: image.originalFilename,
                content: await this.returnImages.read(image.filePath),
                contentType: image.mimeType,
            });
        }
        return attachments;
    }
    async sendMailForPayload(payload, companyId, to, pdfBuffer, pdfFilename, extraAttachments = []) {
        const attachments = [{ filename: pdfFilename, content: pdfBuffer }, ...extraAttachments];
        switch (payload.kind) {
            case 'purchase-order':
                return this.mail.sendPurchaseOrderToSupplier({
                    companyId,
                    to,
                    content: payload.content,
                    attachments,
                    overrides: payload.overrides,
                });
            case 'invoice':
                return this.mail.sendInvoiceCreated({
                    companyId,
                    to,
                    content: payload.content,
                    attachments,
                    overrides: payload.overrides,
                });
            case 'payment':
                return this.mail.sendPaymentReceived({
                    companyId,
                    to,
                    content: payload.content,
                    attachments,
                    overrides: payload.overrides,
                });
            case 'sales-order':
                return this.mail.sendSalesOrderToCustomer({
                    companyId,
                    to,
                    content: payload.content,
                    attachments,
                    overrides: payload.overrides,
                });
            case 'supplier-bill':
                return this.mail.sendSupplierBillIssued({
                    companyId,
                    to,
                    content: payload.content,
                    attachments,
                    overrides: payload.overrides,
                });
            case 'supplier-payment':
                return this.mail.sendSupplierPaymentRecorded({
                    companyId,
                    to,
                    content: payload.content,
                    attachments,
                    overrides: payload.overrides,
                });
            case 'goods-receipt':
                return this.mail.sendGoodsReceiptToSupplier({
                    companyId,
                    to,
                    content: payload.content,
                    attachments,
                    overrides: payload.overrides,
                });
            case 'sales-quotation':
                return this.mail.sendSalesQuotationToCustomer({
                    companyId,
                    to,
                    content: payload.content,
                    attachments,
                    overrides: payload.overrides,
                });
            case 'goods-return':
                return this.mail.sendSupplierReturnNotice({
                    companyId,
                    to,
                    cc: payload.cc,
                    content: payload.content,
                    attachments,
                    overrides: payload.overrides,
                });
            default:
                throw new common_1.BadRequestException(`Unsupported email payload kind: ${payload.kind}`);
        }
    }
    async writeAudit(userId, row, outcome, errorMessage, payload, attachmentFilename) {
        const auditEntity = document_email_constants_1.DOCUMENT_KIND_TO_AUDIT_ENTITY[row.entityType] ?? row.entityType.toUpperCase();
        const triggerLabel = row.trigger.toLowerCase();
        const verb = outcome === 'sent' ? 'emailed' : 'email failed';
        const message = outcome === 'sent'
            ? `${row.documentNumber} ${verb} to ${row.recipient}${row.trigger === client_1.DocumentEmailTrigger.RESEND ? ' (resent manually)' : ''}`
            : `${row.documentNumber} ${verb}: ${errorMessage ?? 'unknown error'}`;
        await this.audit.log({
            companyId: row.companyId,
            userId,
            action: client_1.AuditAction.POST,
            entityType: auditEntity,
            entityId: row.entityId,
            newValues: {
                message,
                documentNumber: row.documentNumber,
                recipient: row.recipient,
                trigger: triggerLabel,
                templateId: row.templateId,
                attachmentFilename: attachmentFilename ?? null,
                status: outcome,
                error: errorMessage ?? null,
                ...(0, audit_context_1.auditRequestMetadata)(),
                poNumber: payload?.kind === 'purchase-order' ? payload.content.poNumber : undefined,
                invoiceNumber: payload?.kind === 'invoice' ? payload.content.invoiceNumber : undefined,
                receiptNumber: payload?.kind === 'payment' ? payload.content.receiptNumber : undefined,
                soNumber: payload?.kind === 'sales-order' ? payload.content.soNumber : undefined,
                billNumber: payload?.kind === 'supplier-bill'
                    ? payload.content.billNumber
                    : payload?.kind === 'supplier-payment'
                        ? payload.content.billNumber
                        : undefined,
                paymentNumber: payload?.kind === 'supplier-payment' ? payload.content.paymentNumber : undefined,
                grNumber: payload?.kind === 'goods-receipt' ? payload.content.grNumber : undefined,
                quoteNumber: payload?.kind === 'sales-quotation' ? payload.content.quoteNumber : undefined,
                returnNumber: payload?.kind === 'goods-return' ? payload.content.returnNumber : undefined,
            },
        });
    }
    serializeHistoryRow(row) {
        return {
            id: row.id,
            entityType: row.entityType,
            entityId: row.entityId,
            documentNumber: row.documentNumber,
            templateId: row.templateId,
            recipient: row.recipient,
            attachmentFilename: row.attachmentFilename,
            status: row.status,
            trigger: row.trigger,
            attempts: row.attempts,
            retryCount: row.retryCount,
            lastError: row.lastError,
            nextRetryAt: row.nextRetryAt?.toISOString() ?? null,
            sentAt: row.sentAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
        };
    }
};
exports.DocumentEmailService = DocumentEmailService;
exports.DocumentEmailService = DocumentEmailService = DocumentEmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, bullmq_1.InjectQueue)(document_email_constants_1.DOCUMENT_EMAIL_QUEUE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_pdf_service_1.DocumentPdfService,
        mail_service_1.MailService,
        email_notifications_service_1.EmailNotificationsService,
        audit_service_1.AuditService,
        return_image_storage_service_1.ReturnImageStorageService,
        bullmq_2.Queue])
], DocumentEmailService);
//# sourceMappingURL=document-email.service.js.map