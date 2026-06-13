import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  AuditAction,
  DocumentEmailStatus,
  DocumentEmailTrigger,
  Prisma,
} from '@prisma/client';
import { Queue } from 'bullmq';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { MailService } from '../../common/mail/mail.service';
import type { PurchaseOrderEmailContent } from '../../common/mail/purchase-order-supplier.template';
import type { ReturnNoticeEmailContent } from '../../common/mail/return-notice.template';
import type { SalesQuotationEmailContent } from '../../common/mail/sales-quotation.template';
import type {
  GoodsReceiptSupplierEmailContent,
  InvoiceCreatedEmailContent,
  PaymentReceivedEmailContent,
  SalesOrderCustomerEmailContent,
  SupplierBillIssuedEmailContent,
  SupplierPaymentRecordedEmailContent,
} from '../../common/mail/transactional-email.templates';
import { auditRequestMetadata } from '../../common/utils/audit-context';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReturnImageStorageService } from '../../common/upload/return-image-storage.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import {
  DOCUMENT_EMAIL_QUEUE,
  DOCUMENT_KIND_TO_AUDIT_ENTITY,
  MAX_BACKGROUND_RETRIES,
  PDF_IMMEDIATE_RETRIES,
  PDF_RETRY_DELAY_MS,
  backgroundRetryDelayMs,
} from './document-email.constants';
import type {
  DocumentEmailHistoryRow,
  DocumentEmailPayload,
  DocumentEmailSendResult,
  DocumentEmailSummary,
  PurchaseOrderEmailPayload,
  EmailOverrides,
} from './document-email.types';

type OutboxJobData = { outboxId: string };

@Injectable()
export class DocumentEmailService {
  private readonly logger = new Logger(DocumentEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentPdf: DocumentPdfService,
    private readonly mail: MailService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly audit: AuditService,
    private readonly returnImages: ReturnImageStorageService,
    @InjectQueue(DOCUMENT_EMAIL_QUEUE) private readonly queue: Queue<OutboxJobData>,
  ) {}

  async listHistory(entityType: string, entityId: string): Promise<DocumentEmailHistoryRow[]> {
    const rows = await this.prisma.documentEmailOutbox.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.serializeHistoryRow(row));
  }

  async getLatestSummary(entityType: string, entityId: string): Promise<DocumentEmailSummary | null> {
    const row = await this.prisma.documentEmailOutbox.findFirst({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    return {
      emailStatus: row.status.toLowerCase(),
      lastRecipient: row.recipient,
      lastSentAt: row.sentAt?.toISOString() ?? null,
      lastAttachment: row.attachmentFilename,
      retryCount: row.retryCount,
      lastError: row.lastError,
    };
  }

  /**
   * Send purchase order email with required PDF attachment.
   * Never sends body-only email; queues background retry on PDF/send failure.
   */
  async sendPurchaseOrderEmail(
    user: RequestUser,
    args: {
      poId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: PurchaseOrderEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
    const payload: PurchaseOrderEmailPayload = {
      kind: 'purchase-order',
      content: args.content,
      overrides: args.prepared,
    };

    return this.enqueueDocumentEmail(
      user,
      {
        entityType: 'purchase-order',
        entityId: args.poId,
        documentNumber: args.documentNumber,
        templateId: 'purchase_order_supplier',
        companyId: args.companyId,
        shopId: args.shopId,
        recipient: args.recipient,
        payload,
        trigger: args.trigger,
      },
      { asyncOnly: true },
    );
  }

  async sendInvoiceEmail(
    user: RequestUser,
    args: {
      invoiceId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: InvoiceCreatedEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
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

  async sendPaymentEmail(
    user: RequestUser,
    args: {
      paymentId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: PaymentReceivedEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
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

  async sendSalesOrderEmail(
    user: RequestUser,
    args: {
      salesOrderId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: SalesOrderCustomerEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
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

  async sendSupplierBillEmail(
    user: RequestUser,
    args: {
      billId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: SupplierBillIssuedEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
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

  async sendSupplierPaymentEmail(
    user: RequestUser,
    args: {
      paymentId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: SupplierPaymentRecordedEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
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

  async sendGoodsReceiptEmail(
    user: RequestUser,
    args: {
      grId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: GoodsReceiptSupplierEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
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

  async sendSalesQuotationEmail(
    user: RequestUser,
    args: {
      quoteId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: SalesQuotationEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
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

  async sendGoodsReturnEmail(
    user: RequestUser,
    args: {
      returnId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: ReturnNoticeEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
      cc?: string;
    },
  ): Promise<DocumentEmailSendResult> {
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

  private async enqueueDocumentEmail(
    user: RequestUser,
    args: {
      entityType: string;
      entityId: string;
      documentNumber: string;
      templateId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      payload: DocumentEmailPayload;
      trigger: DocumentEmailTrigger;
    },
    options?: { asyncOnly?: boolean },
  ): Promise<DocumentEmailSendResult> {
    const outbox = await this.prisma.documentEmailOutbox.create({
      data: {
        entityType: args.entityType,
        entityId: args.entityId,
        documentNumber: args.documentNumber,
        templateId: args.templateId,
        companyId: args.companyId,
        shopId: args.shopId,
        recipient: args.recipient.toLowerCase(),
        status: DocumentEmailStatus.PENDING_PDF,
        trigger: args.trigger,
        payloadJson: args.payload as unknown as Prisma.InputJsonValue,
        sentById: user.id,
      },
    });

    if (options?.asyncOnly) {
      await this.queue.add(
        'retry',
        { outboxId: outbox.id },
        {
          jobId: `document-email-${outbox.id}-0`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      return {
        sent: false,
        queued: true,
        to: args.recipient,
        attachment: null,
        pdfAttached: false,
        emailStatus: 'pending_pdf',
        outboxId: outbox.id,
        message:
          'Document saved. Supplier email is queued and will be sent automatically with PDF attachment.',
      };
    }

    try {
      return await this.processOutbox(outbox.id, user.id);
    } catch (err) {
      const message = (err as Error).message ?? 'Email delivery failed';
      await this.scheduleBackgroundRetry(outbox.id, message);
      return {
        sent: false,
        queued: true,
        to: args.recipient,
        attachment: null,
        pdfAttached: false,
        emailStatus: 'pending_pdf',
        outboxId: outbox.id,
        message:
          'PDF generation failed and will be retried automatically. Email has not been sent.',
      };
    }
  }

  async processOutbox(outboxId: string, actorUserId?: string): Promise<DocumentEmailSendResult> {
    const row = await this.prisma.documentEmailOutbox.findUnique({ where: { id: outboxId } });
    if (!row) {
      throw new BadRequestException('Email outbox entry not found');
    }
    if (row.status === DocumentEmailStatus.SENT || row.status === DocumentEmailStatus.DELIVERED) {
      return {
        sent: true,
        to: row.recipient,
        attachment: row.attachmentFilename,
        pdfAttached: Boolean(row.attachmentFilename),
        emailStatus: row.status.toLowerCase(),
        outboxId: row.id,
      };
    }
    if (row.status === DocumentEmailStatus.FAILED) {
      throw new BadRequestException(row.lastError ?? 'Email delivery failed permanently');
    }

    const userId = actorUserId ?? row.sentById ?? undefined;
    await this.prisma.documentEmailOutbox.update({
      where: { id: outboxId },
      data: { attempts: { increment: 1 } },
    });

    const payload = row.payloadJson as unknown as DocumentEmailPayload;
    let pdfBuffer: Buffer;
    let pdfFilename: string;

    try {
      const pdfResult = await this.renderPdfForPayload(payload, row.entityId);
      pdfBuffer = pdfResult.buffer;
      pdfFilename = pdfResult.filename;
    } catch (err) {
      const message = (err as Error).message ?? 'PDF generation failed';
      await this.prisma.documentEmailOutbox.update({
        where: { id: outboxId },
        data: {
          status: DocumentEmailStatus.PENDING_PDF,
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
        status: DocumentEmailStatus.PENDING_SEND,
        attachmentFilename: pdfFilename,
        lastError: null,
      },
    });

    try {
      const extraAttachments =
        payload.kind === 'goods-return'
          ? await this.loadReturnImageAttachments(row.entityId)
          : [];
      const delivery = await this.sendMailForPayload(
        payload,
        row.companyId,
        row.recipient,
        pdfBuffer,
        pdfFilename,
        extraAttachments,
      );

      await this.prisma.documentEmailOutbox.update({
        where: { id: outboxId },
        data: {
          status: DocumentEmailStatus.SENT,
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
    } catch (err) {
      const message = (err as Error).message ?? 'Email send failed';
      await this.prisma.documentEmailOutbox.update({
        where: { id: outboxId },
        data: {
          status: DocumentEmailStatus.PENDING_SEND,
          lastError: message,
        },
      });
      if (userId) {
        await this.writeAudit(userId, row, 'failed', message, payload);
      }
      throw new Error(message, { cause: err });
    }
  }

  async scheduleBackgroundRetry(outboxId: string, lastError: string) {
    const row = await this.prisma.documentEmailOutbox.findUnique({ where: { id: outboxId } });
    if (!row) return;

    const nextRetryCount = row.retryCount + 1;
    if (nextRetryCount > MAX_BACKGROUND_RETRIES) {
      await this.prisma.documentEmailOutbox.update({
        where: { id: outboxId },
        data: {
          status: DocumentEmailStatus.FAILED,
          retryCount: nextRetryCount,
          lastError,
          nextRetryAt: null,
        },
      });
      if (row.sentById) {
        const payload = row.payloadJson as unknown as DocumentEmailPayload;
        await this.writeAudit(row.sentById, row, 'failed', lastError, payload);
      }
      this.logger.warn(`Document email ${outboxId} failed permanently after ${nextRetryCount} retries`);
      return;
    }

    const delayMs = backgroundRetryDelayMs(nextRetryCount);
    const nextRetryAt = new Date(Date.now() + delayMs);

    await this.prisma.documentEmailOutbox.update({
      where: { id: outboxId },
      data: {
        retryCount: nextRetryCount,
        lastError,
        nextRetryAt,
        status:
          row.status === DocumentEmailStatus.PENDING_SEND
            ? DocumentEmailStatus.PENDING_SEND
            : DocumentEmailStatus.PENDING_PDF,
      },
    });

    await this.queue.add(
      'retry',
      { outboxId },
      {
        jobId: `document-email-${outboxId}-${nextRetryCount}`,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Queued document email retry ${outboxId} in ${Math.round(delayMs / 1000)}s (attempt ${nextRetryCount})`,
    );
  }

  private async renderPdfForPayload(payload: DocumentEmailPayload, entityId: string) {
    switch (payload.kind) {
      case 'purchase-order':
        return this.documentPdf.renderPurchaseOrderPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'invoice':
        return this.documentPdf.renderInvoicePdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'payment':
        return this.documentPdf.renderPaymentReceiptPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'sales-order':
        return this.documentPdf.renderSalesOrderPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'supplier-bill':
        return this.documentPdf.renderSupplierBillPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'supplier-payment':
        return this.documentPdf.renderSupplierPaymentPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'goods-receipt':
        return this.documentPdf.renderGoodsReceiptPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'sales-quotation':
        return this.documentPdf.renderSalesQuotationPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'goods-return':
        return this.documentPdf.renderGoodsReturnPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      default:
        throw new BadRequestException(`Unsupported email payload kind: ${(payload as { kind?: string }).kind}`);
    }
  }

  private async loadReturnImageAttachments(entityId: string) {
    const images = await this.prisma.supplierReturnImage.findMany({
      where: { returnId: entityId },
      orderBy: { createdAt: 'asc' },
    });
    const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
    for (const image of images) {
      attachments.push({
        filename: image.originalFilename,
        content: await this.returnImages.read(image.filePath),
        contentType: image.mimeType,
      });
    }
    return attachments;
  }

  private async sendMailForPayload(
    payload: DocumentEmailPayload,
    companyId: string,
    to: string,
    pdfBuffer: Buffer,
    pdfFilename: string,
    extraAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [],
  ) {
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
        throw new BadRequestException(`Unsupported email payload kind: ${(payload as { kind?: string }).kind}`);
    }
  }

  private async writeAudit(
    userId: string,
    row: {
      companyId: string;
      entityType: string;
      entityId: string;
      documentNumber: string;
      recipient: string;
      trigger: DocumentEmailTrigger;
      templateId: string;
    },
    outcome: 'sent' | 'failed',
    errorMessage?: string,
    payload?: DocumentEmailPayload,
    attachmentFilename?: string,
  ) {
    const auditEntity =
      DOCUMENT_KIND_TO_AUDIT_ENTITY[row.entityType] ?? row.entityType.toUpperCase();
    const triggerLabel = row.trigger.toLowerCase();
    const verb = outcome === 'sent' ? 'emailed' : 'email failed';
    const message =
      outcome === 'sent'
        ? `${row.documentNumber} ${verb} to ${row.recipient}${row.trigger === DocumentEmailTrigger.RESEND ? ' (resent manually)' : ''}`
        : `${row.documentNumber} ${verb}: ${errorMessage ?? 'unknown error'}`;

    await this.audit.log({
      companyId: row.companyId,
      userId,
      action: AuditAction.POST,
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
        ...auditRequestMetadata(),
        poNumber: payload?.kind === 'purchase-order' ? payload.content.poNumber : undefined,
        invoiceNumber: payload?.kind === 'invoice' ? payload.content.invoiceNumber : undefined,
        receiptNumber: payload?.kind === 'payment' ? payload.content.receiptNumber : undefined,
        soNumber: payload?.kind === 'sales-order' ? payload.content.soNumber : undefined,
        billNumber:
          payload?.kind === 'supplier-bill'
            ? payload.content.billNumber
            : payload?.kind === 'supplier-payment'
              ? payload.content.billNumber
              : undefined,
        paymentNumber:
          payload?.kind === 'supplier-payment' ? payload.content.paymentNumber : undefined,
        grNumber: payload?.kind === 'goods-receipt' ? payload.content.grNumber : undefined,
        quoteNumber: payload?.kind === 'sales-quotation' ? payload.content.quoteNumber : undefined,
        returnNumber: payload?.kind === 'goods-return' ? payload.content.returnNumber : undefined,
      },
    });
  }

  private serializeHistoryRow(row: {
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
    nextRetryAt: Date | null;
    sentAt: Date | null;
    createdAt: Date;
  }): DocumentEmailHistoryRow {
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
}

