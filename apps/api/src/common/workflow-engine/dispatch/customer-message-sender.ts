import { Injectable, Logger } from '@nestjs/common';

/**
 * The adapter seam for actually sending a customer message (Plan §11 dispatch
 * layer; §2 "Adapters"). The dispatch pipeline decides *what/where/when* to send
 * and always ledgers the decision; this interface is the one place a real
 * WhatsApp/Email transport plugs in.
 *
 * Kept behind a DI token so the default is the safe, no-network
 * {@link LedgerOnlySender}: the whole pipeline runs live (routing, consent,
 * ledger, timeline, thread transitions) without emitting a single external
 * message until a real adapter is bound and the tenant's `channel-routing`
 * feature flag is on. This is the guardrail that lets us wire dispatch on
 * staging without customer-visible sends.
 */
export type SendableChannel = 'WHATSAPP' | 'EMAIL';

export interface CustomerSendRequest {
  readonly companyId: string;
  readonly customerId: string;
  readonly channel: SendableChannel;
  readonly tone: string;
  readonly invoiceNumber: string;
  readonly balanceDue: number;
  readonly address?: string;
}

export interface CustomerSendResult {
  readonly sent: boolean;
  readonly providerMessageId: string | null;
  readonly detail: string;
}

export interface CustomerMessageSender {
  send(request: CustomerSendRequest): Promise<CustomerSendResult>;
}

/** DI token for the active {@link CustomerMessageSender}. */
export const CUSTOMER_MESSAGE_SENDER = Symbol('CUSTOMER_MESSAGE_SENDER');

/**
 * Default sender: records the *intent* to send and returns success without any
 * external call. Swap for a WhatsApp/Email adapter (behind the channel-routing
 * flag + provider creds) to go live.
 */
@Injectable()
export class LedgerOnlySender implements CustomerMessageSender {
  private readonly logger = new Logger(LedgerOnlySender.name);

  async send(request: CustomerSendRequest): Promise<CustomerSendResult> {
    this.logger.debug(
      `[ledger-only] would send ${request.tone} to customer ${request.customerId} via ${request.channel} for ${request.invoiceNumber}.`,
    );
    return { sent: false, providerMessageId: null, detail: 'ledger-only sender: no external message emitted' };
  }
}
