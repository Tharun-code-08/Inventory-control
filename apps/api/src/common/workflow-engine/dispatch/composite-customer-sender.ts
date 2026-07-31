import { Injectable } from '@nestjs/common';
import { WhatsAppCustomerSender } from './whatsapp-customer-sender';
import { EmailCustomerSender } from './email-customer-sender';
import {
  CustomerMessageSender,
  CustomerSendRequest,
  CustomerSendResult,
} from './customer-message-sender';

/**
 * The single {@link CustomerMessageSender} bound to CUSTOMER_MESSAGE_SENDER,
 * routing each request to the transport for its channel (Plan §2/§11: the
 * channel router picks WhatsApp/Email, the adapter layer executes it):
 *
 *   WHATSAPP → WhatsAppCustomerSender (Meta template send)
 *   EMAIL    → EmailCustomerSender    (tenant SMTP)
 *
 * Any other channel degrades to ledger-only. Each underlying sender is itself
 * safe-by-default (no creds / no template / not-configured ⇒ sent:false), so a
 * partially-provisioned tenant simply doesn't emit on the un-provisioned
 * channel — the pipeline still ledgers every decision.
 */
@Injectable()
export class CompositeCustomerSender implements CustomerMessageSender {
  constructor(
    private readonly whatsapp: WhatsAppCustomerSender,
    private readonly email: EmailCustomerSender,
  ) {}

  send(request: CustomerSendRequest): Promise<CustomerSendResult> {
    switch (request.channel) {
      case 'WHATSAPP':
        return this.whatsapp.send(request);
      case 'EMAIL':
        return this.email.send(request);
      default:
        return Promise.resolve({
          sent: false,
          providerMessageId: null,
          detail: `no transport bound for channel ${request.channel}`,
        });
    }
  }
}
