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

  private getFromAddress(): string {
    return this.env('MAIL_FROM') || 'office@softdigitconsulting.com';
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

    const port = Number(this.env('SMTP_PORT') ?? 587);
    const secure = this.env('SMTP_SECURE') === 'true' || port === 465;
    const user = this.env('SMTP_USER');
    const pass = this.env('SMTP_PASS');

    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transport.verify();
    this.transporter = transport;
    this.transporterKey = key;
    this.logger.log(`SMTP ready (${host}:${port})`);
    return transport;
  }

  async sendMail(args: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<string> {
    const transport = await this.getTransporter();
    const from = this.getFromAddress();
    const info = await transport.sendMail({
      from: `"Retail IMS" <${from}>`,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
    const messageId = info.messageId ?? '';
    this.logger.log(`Email sent to ${args.to} from ${from} messageId=${messageId}`);
    return messageId;
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
        const messageId = await this.sendMail({
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
          messageId: messageId || undefined,
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
    });
  }
}
