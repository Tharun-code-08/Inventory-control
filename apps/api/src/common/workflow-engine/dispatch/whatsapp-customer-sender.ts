import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppAdapter } from '@/modules/agent-platform/channels/whatsapp/whatsapp.adapter';
import {
  CustomerMessageSender,
  CustomerSendRequest,
  CustomerSendResult,
} from './customer-message-sender';

/**
 * Real WhatsApp transport for customer dunning (Plan §2/§11 adapters). Bound to
 * the {@link CUSTOMER_MESSAGE_SENDER} token so the dispatch pipeline sends over
 * Meta's WhatsApp Cloud API — but only ever *called* when the tenant's
 * `channel-routing` feature flag is on (the dispatch service gates it), giving
 * two independent kill-switches: the flag, and this sender degrading to
 * "no send" whenever it isn't fully provisioned.
 *
 * Dunning is business-initiated and lands outside Meta's 24h service window, so
 * Meta requires a **pre-approved template** — plain text would be rejected. This
 * sender therefore uses `sendTemplate` with a per-tone, env-configured, approved
 * template. When creds or an approved template are missing, or the channel is
 * anything other than WhatsApp, it returns `sent:false` (the pipeline then
 * ledgers the decision without an external message) and never throws.
 */
@Injectable()
export class WhatsAppCustomerSender implements CustomerMessageSender {
  private readonly logger = new Logger(WhatsAppCustomerSender.name);

  constructor(
    private readonly whatsapp: WhatsAppAdapter,
    private readonly config: ConfigService,
  ) {}

  async send(request: CustomerSendRequest): Promise<CustomerSendResult> {
    if (request.channel !== 'WHATSAPP') {
      return { sent: false, providerMessageId: null, detail: `whatsapp sender: ${request.channel} not bound (ledger-only)` };
    }
    if (!request.address) {
      return { sent: false, providerMessageId: null, detail: 'whatsapp sender: no opted-in WhatsApp number on file' };
    }
    if (!this.whatsapp.isConfigured()) {
      return { sent: false, providerMessageId: null, detail: 'whatsapp sender: adapter not configured (WHATSAPP_* creds missing)' };
    }

    const template = this.templateFor(request.tone);
    if (!template) {
      return { sent: false, providerMessageId: null, detail: `whatsapp sender: no approved template for tone "${request.tone}"` };
    }

    try {
      const result = await this.whatsapp.sendTemplate({
        to: request.address,
        name: template.name,
        languageCode: template.language,
        // Body parameters the approved template expects, in order:
        // {{1}} = invoice number, {{2}} = outstanding balance.
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: request.invoiceNumber },
              { type: 'text', text: this.formatMoney(request.balanceDue) },
            ],
          },
        ],
      });
      return {
        sent: true,
        providerMessageId: result.providerMessageId,
        detail: `whatsapp template "${template.name}" sent`,
      };
    } catch (err) {
      // A provider error must not crash the pipeline; ledger it as not-sent.
      const message = (err as Error).message;
      this.logger.warn(`WhatsApp send failed for customer ${request.customerId}: ${message}`);
      return { sent: false, providerMessageId: null, detail: `whatsapp send failed: ${message}` };
    }
  }

  /** Resolve the Meta-approved template + language for a dunning tone from env. */
  private templateFor(tone: string): { name: string; language: string } | null {
    const language =
      this.config.get<string>('WHATSAPP_DUNNING_TEMPLATE_LANG')?.trim() || 'en';
    const specific = this.config
      .get<string>(`WHATSAPP_DUNNING_TEMPLATE_${tone.toUpperCase()}`)
      ?.trim();
    const fallback = this.config.get<string>('WHATSAPP_DUNNING_TEMPLATE')?.trim();
    const name = specific || fallback;
    return name ? { name, language } : null;
  }

  private formatMoney(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
}
