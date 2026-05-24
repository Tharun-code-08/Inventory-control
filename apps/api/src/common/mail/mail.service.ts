import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { buildSupplierDeleteConfirmUrl, buildSupplierPortalSubmitUrl } from './portal-url';
import {
  supplierDeletionHtml,
  supplierDeletionSubject,
  supplierDeletionText,
} from './supplier-deletion.template';
import {
  rfqInviteHtml,
  rfqInviteSubject,
  rfqInviteText,
  type RfqInviteEmailContent,
} from './rfq-invite.template';
import {
  salesQuotationHtml,
  salesQuotationSubject,
  salesQuotationText,
  type SalesQuotationEmailContent,
} from './sales-quotation.template';
import {
  purchaseOrderHtml,
  purchaseOrderSubject,
  purchaseOrderText,
  type PurchaseOrderEmailContent,
} from './purchase-order-supplier.template';
import {
  signupOtpHtml,
  signupOtpSubject,
  signupOtpText,
  type SignupOtpEmailContent,
} from './signup-otp.template';

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

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private transporterKey = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.smtpHost();
    if (!host) {
      this.logger.warn('SMTP_HOST is not set — RFQ supplier emails will not send');
      return;
    }
    void this.getTransporter().catch((err) => {
      this.logger.error(`SMTP startup check failed: ${(err as Error).message}`);
    });
  }

  /** Prefer ConfigService; fall back to process.env (load-env / dotenv). */
  private env(key: string): string | undefined {
    const fromConfig = this.config.get<string>(key);
    if (fromConfig != null && String(fromConfig).trim() !== '') {
      return String(fromConfig).trim();
    }
    const fromProcess = process.env[key];
    return fromProcess?.trim() || undefined;
  }

  smtpHost(): string | undefined {
    return this.env('SMTP_HOST');
  }

  isConfigured(): boolean {
    return Boolean(this.smtpHost());
  }

  private smtpUser(): string | undefined {
    return this.env('SMTP_USER');
  }

  /** Use authenticated mailbox as From when MAIL_FROM is unset (Zoho requires matching address). */
  private getFromAddress(): string {
    const explicit = this.env('MAIL_FROM');
    const authUser = this.smtpUser();
    const from = explicit || authUser || 'office@softdigitconsulting.com';
    if (explicit && authUser && explicit.toLowerCase() !== authUser.toLowerCase()) {
      this.logger.warn(
        `MAIL_FROM (${explicit}) differs from SMTP_USER (${authUser}). For Zoho, both must be the same mailbox.`,
      );
    }
    return from;
  }

  private isZohoHost(host: string): boolean {
    return /zoho\.(com|in|eu)/i.test(host);
  }

  private getReplyToAddress(): string {
    return this.env('MAIL_REPLY_TO') || this.getFromAddress();
  }

  private getBccAddress(): string | undefined {
    return this.env('MAIL_BCC');
  }

  private smtpSettingsKey(): string {
    return [
      this.smtpHost(),
      this.env('SMTP_PORT'),
      this.env('SMTP_SECURE'),
      this.env('SMTP_USER'),
      this.env('SMTP_PASS'),
    ].join('|');
  }

  private async getTransporter(): Promise<Transporter> {
    const host = this.smtpHost();
    if (!host) {
      throw new Error(
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env and restart the API.',
      );
    }

    const key = this.smtpSettingsKey();
    if (this.transporter && this.transporterKey === key) {
      return this.transporter;
    }

    const zoho = this.isZohoHost(host);
    const port = Number(this.env('SMTP_PORT') ?? (zoho ? 465 : 587));
    const secureExplicit = this.env('SMTP_SECURE');
    const secure =
      secureExplicit === 'true' || (secureExplicit !== 'false' && port === 465);
    const user = this.env('SMTP_USER');
    const pass = this.env('SMTP_PASS');

    if (zoho && user && !user.includes('@')) {
      this.logger.warn('Zoho SMTP_USER should be the full email address (e.g. office@softdigitconsulting.com)');
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure && port === 587,
      auth: user && pass ? { user, pass } : undefined,
      tls: { minVersion: 'TLSv1.2', servername: host },
    });

    await transport.verify();
    this.transporter = transport;
    this.transporterKey = key;
    this.logger.log(`SMTP ready (${host}:${port}, secure=${secure}${zoho ? ', Zoho' : ''})`);
    return transport;
  }

  async sendMail(args: {
    to: string;
    subject: string;
    text: string;
    html: string;
    fromName?: string;
    attachments?: Array<{ filename: string; content: Buffer | string }>;
  }): Promise<EmailDeliveryResult> {
    const transport = await this.getTransporter();
    const from = this.getFromAddress();
    const replyTo = this.getReplyToAddress();
    const bcc = this.getBccAddress();
    const authUser = this.smtpUser();
    const displayName = args.fromName ?? 'Softdigit Consulting';

    const useEnvelopeFrom = authUser && authUser.toLowerCase() === from.toLowerCase();
    const info = await transport.sendMail({
      from: `"${displayName}" <${from}>`,
      replyTo,
      to: args.to,
      bcc: bcc || undefined,
      subject: args.subject,
      text: args.text,
      html: args.html,
      attachments: args.attachments,
      ...(useEnvelopeFrom
        ? { envelope: { from: authUser, to: args.to } }
        : {}),
    });

    const rejected = (info as { rejected?: string[] }).rejected;
    if (rejected?.length) {
      throw new Error(`Mail server rejected recipient(s): ${rejected.join(', ')}`);
    }

    const messageId = info.messageId ?? '';
    this.logger.log(
      `Email sent to=${args.to} from=${from} replyTo=${replyTo}${bcc ? ` bcc=${bcc}` : ''} messageId=${messageId}`,
    );

    return { messageId, to: args.to, from, replyTo, bcc };
  }

  rfqPortalAccessCode(rfqId: string): string {
    return rfqId.replace(/-/g, '').slice(0, 8).toUpperCase();
  }

  buildRfqInviteContent(args: {
    rfqId: string;
    rfqNumber: string;
    rfqTitle: string;
    deadline?: Date | null;
    supplierName: string;
  }): RfqInviteEmailContent {
    const portalUrl = buildSupplierPortalSubmitUrl(this.config, args.rfqId);
    const deadline = args.deadline
      ? args.deadline.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;

    return {
      supplierName: args.supplierName,
      rfqNumber: args.rfqNumber,
      rfqTitle: args.rfqTitle,
      deadline,
      portalUrl,
      accessCode: this.rfqPortalAccessCode(args.rfqId),
    };
  }

  async sendRfqInvites(args: {
    rfqId: string;
    rfqNumber: string;
    rfqTitle: string;
    deadline?: Date | null;
    recipients: RfqInviteRecipient[];
  }): Promise<RfqInviteDeliverySummary> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        sent: 0,
        failed: 0,
        skipped: args.recipients.length,
        results: args.recipients.map((r) => ({
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          email: r.email,
          status: 'skipped',
          error: 'SMTP not configured',
        })),
      };
    }

    try {
      await this.getTransporter();
    } catch (err) {
      const message = (err as Error).message;
      return {
        configured: true,
        sent: 0,
        failed: args.recipients.length,
        skipped: 0,
        results: args.recipients.map((r) => ({
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          email: r.email,
          status: 'failed',
          error: message,
        })),
      };
    }

    const results: RfqInviteEmailResult[] = [];

    for (const recipient of args.recipients) {
      const email = recipient.email?.trim();
      if (!email) {
        results.push({
          supplierId: recipient.supplierId,
          supplierName: recipient.supplierName,
          email: '',
          status: 'skipped',
          error: 'Supplier has no email address',
        });
        continue;
      }

      const content = this.buildRfqInviteContent({
        rfqId: args.rfqId,
        rfqNumber: args.rfqNumber,
        rfqTitle: args.rfqTitle,
        deadline: args.deadline,
        supplierName: recipient.supplierName,
      });

      try {
        const delivery = await this.sendMail({
          to: email,
          subject: rfqInviteSubject(content),
          text: rfqInviteText(content),
          html: rfqInviteHtml(content),
        });
        results.push({
          supplierId: recipient.supplierId,
          supplierName: recipient.supplierName,
          email,
          status: 'sent',
          messageId: delivery.messageId || undefined,
        });
      } catch (err) {
        const message = (err as Error).message ?? 'Send failed';
        this.logger.error(`RFQ invite email failed for ${email}: ${message}`);
        results.push({
          supplierId: recipient.supplierId,
          supplierName: recipient.supplierName,
          email,
          status: 'failed',
          error: message,
        });
      }
    }

    return {
      configured: true,
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      results,
    };
  }

  buildSalesQuotationEmailContent(args: {
    customerName: string;
    quoteNumber: string;
    quoteDate: Date;
    validUntil?: Date | null;
    shopName: string;
    remarks?: string | null;
    totalValue: string | number | { toString(): string };
    items: Array<{
      quantity: string | number | { toString(): string };
      uom: string;
      unitPrice: string | number | { toString(): string };
      lineValue: string | number | { toString(): string };
      product: { productCode: string; description: string };
    }>;
    companyName?: string;
    portalUrl?: string | null;
    isRevision?: boolean;
  }): SalesQuotationEmailContent {
    const formatDate = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatMoney = (v: string | number | { toString(): string }) => {
      const n = Number(v);
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(Number.isFinite(n) ? n : 0);
    };

    return {
      customerName: args.customerName,
      quoteNumber: args.quoteNumber,
      quoteDate: formatDate(args.quoteDate),
      validUntil: args.validUntil ? formatDate(args.validUntil) : null,
      shopName: args.shopName,
      remarks: args.remarks ?? null,
      companyName: args.companyName ?? 'Softdigit Consulting',
      portalUrl: args.portalUrl ?? null,
      isRevision: args.isRevision ?? false,
      totalValue: formatMoney(args.totalValue),
      lines: args.items.map((item) => ({
        code: item.product.productCode,
        description: item.product.description,
        quantity: String(item.quantity),
        uom: item.uom,
        unitPrice: formatMoney(item.unitPrice),
        lineValue: formatMoney(item.lineValue),
      })),
    };
  }

  async sendSalesQuotationToCustomer(args: {
    to: string;
    content: SalesQuotationEmailContent;
  }): Promise<EmailDeliveryResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env and restart the API.',
      );
    }
    return this.sendMail({
      to: args.to,
      subject: salesQuotationSubject(args.content),
      text: salesQuotationText(args.content),
      html: salesQuotationHtml(args.content),
      fromName: args.content.companyName,
    });
  }

  async sendPurchaseOrderToSupplier(args: {
    to: string;
    content: PurchaseOrderEmailContent;
    attachments?: Array<{ filename: string; content: Buffer | string }>;
  }): Promise<EmailDeliveryResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env and restart the API.',
      );
    }
    return this.sendMail({
      to: args.to,
      subject: purchaseOrderSubject(args.content),
      text: purchaseOrderText(args.content),
      html: purchaseOrderHtml(args.content),
      fromName: args.content.companyName,
      attachments: args.attachments,
    });
  }

  async sendSignupOtp(args: {
    to: string;
    adminName: string;
    companyName: string;
    otpCode: string;
    expiresMinutes: number;
  }): Promise<EmailDeliveryResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env and restart the API.',
      );
    }

    const content: SignupOtpEmailContent = {
      adminName: args.adminName,
      companyName: args.companyName,
      email: args.to,
      otpCode: args.otpCode,
      expiresMinutes: args.expiresMinutes,
    };

    return this.sendMail({
      to: args.to,
      subject: signupOtpSubject(args.companyName),
      text: signupOtpText(content),
      html: signupOtpHtml(content),
      fromName: 'Softdigit Consulting',
    });
  }

  async sendSupplierDeletionConfirm(args: {
    adminEmail: string;
    supplierName: string;
    supplierCode: string;
    requestedByName: string;
    confirmToken: string;
    rfqCount: number;
    quotationCount: number;
    contractCount: number;
    purchaseOrderCount: number;
  }): Promise<void> {
    const confirmUrl = buildSupplierDeleteConfirmUrl(this.config, args.confirmToken);
    const content = {
      supplierName: args.supplierName,
      supplierCode: args.supplierCode,
      requestedByName: args.requestedByName,
      confirmUrl,
      rfqCount: args.rfqCount,
      quotationCount: args.quotationCount,
      contractCount: args.contractCount,
      purchaseOrderCount: args.purchaseOrderCount,
    };
    await this.sendMail({
      to: args.adminEmail,
      subject: supplierDeletionSubject(args.supplierName),
      text: supplierDeletionText(content),
      html: supplierDeletionHtml(content),
    }).then(() => undefined);
  }
}
