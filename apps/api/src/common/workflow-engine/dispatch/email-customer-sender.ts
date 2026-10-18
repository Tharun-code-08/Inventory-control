import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '@/common/mail/mail.service';
import { EmailSenderService } from '@/modules/email-senders/email-sender.service';
import {
  CustomerMessageSender,
  CustomerSendRequest,
  CustomerSendResult,
} from './customer-message-sender';

/**
 * Real Email transport for customer dunning (Plan §2/§11 adapters). Sends from
 * the tenant's own verified primary sender over its configured SMTP (the same
 * path business documents already use), via {@link EmailSenderService}
 * .resolveTenantSender + {@link MailService}.sendViaSmtp.
 *
 * Only invoked when the tenant's `channel-routing` flag is on (the dispatch
 * pipeline gates it). Degrades to `sent:false` (→ ledger-only) — never throws —
 * when the channel isn't Email, no address is on file, or the tenant has no
 * verified+SMTP-ready primary sender. Unlike WhatsApp, email needs no template
 * pre-approval, so plain business content is fine.
 */
@Injectable()
export class EmailCustomerSender implements CustomerMessageSender {
  private readonly logger = new Logger(EmailCustomerSender.name);

  constructor(
    private readonly senders: EmailSenderService,
    private readonly mail: MailService,
  ) {}

  async send(request: CustomerSendRequest): Promise<CustomerSendResult> {
    if (request.channel !== 'EMAIL') {
      return { sent: false, providerMessageId: null, detail: `email sender: ${request.channel} not bound (ledger-only)` };
    }
    if (!request.address) {
      return { sent: false, providerMessageId: null, detail: 'email sender: no opted-in email address on file' };
    }

    // A tenant with no verified+SMTP-ready primary sender degrades to ledger-only.
    let sender;
    try {
      sender = await this.senders.resolveTenantSender(request.companyId);
    } catch (err) {
      return { sent: false, providerMessageId: null, detail: `email sender: ${(err as Error).message}` };
    }

    const { subject, text, html } = this.renderDunning(request);
    try {
      const result = await this.mail.sendViaSmtp(sender.smtp, {
        to: request.address,
        subject,
        text,
        html,
        fromName: sender.fromName,
        fromEmail: sender.fromEmail,
        replyTo: sender.replyTo,
        senderId: sender.senderId,
      });
      return { sent: true, providerMessageId: result.messageId || null, detail: `email sent from ${sender.fromEmail}` };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn(`Email send failed for customer ${request.customerId}: ${message}`);
      return { sent: false, providerMessageId: null, detail: `email send failed: ${message}` };
    }
  }

  /** Minimal tone-aware dunning copy. Real templates/branding layer on later. */
  private renderDunning(request: CustomerSendRequest): { subject: string; text: string; html: string } {
    const amount = `₹${request.balanceDue.toLocaleString('en-IN')}`;
    const lead = this.leadLine(request.tone);
    const subject = `${this.subjectPrefix(request.tone)} — Invoice ${request.invoiceNumber}`;
    const text = `${lead}\n\nInvoice ${request.invoiceNumber} has an outstanding balance of ${amount}. Please arrange payment at your earliest convenience.\n\nIf you have already paid, kindly ignore this message.`;
    const html = `<p>${lead}</p><p>Invoice <strong>${request.invoiceNumber}</strong> has an outstanding balance of <strong>${amount}</strong>. Please arrange payment at your earliest convenience.</p><p>If you have already paid, kindly ignore this message.</p>`;
    return { subject, text, html };
  }

  private subjectPrefix(tone: string): string {
    switch (tone) {
      case 'final':
        return 'Final payment notice';
      case 'firm':
        return 'Payment reminder';
      case 'escalation':
        return 'Overdue payment — action required';
      default:
        return 'Payment reminder';
    }
  }

  private leadLine(tone: string): string {
    switch (tone) {
      case 'friendly':
        return 'Just a friendly reminder about your upcoming payment.';
      case 'final':
        return 'This is a final notice regarding your overdue invoice.';
      case 'escalation':
        return 'Your invoice is significantly overdue and requires immediate attention.';
      default:
        return 'A gentle reminder about your outstanding invoice.';
    }
  }
}
