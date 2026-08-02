import { SendableChannel } from './customer-message-sender';

/**
 * The payload carried by a queued send (Plan §11 dispatch layer). Enough to
 * reproduce the send at a later time (deferred) without re-running the pipeline.
 */
export interface DispatchJobData {
  readonly eventId: string;
  readonly correlationId: string;
  readonly companyId: string;
  readonly customerId: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly tone: string;
  readonly balanceDue: number;
  readonly priority: string;
  /** Router-ordered channels to try (fallback order). */
  readonly channels: readonly SendableChannel[];
}

export interface DigestItem {
  readonly invoiceNumber: string;
  readonly balanceDue: number;
}

/**
 * Compose one digest message body from a customer's batched invoices (Plan
 * Phase 3 "Batching"). Pure — the sender delivers the returned text. Keeps the
 * customer from being pinged once per invoice.
 */
export function composeDigest(items: readonly DigestItem[]): { summary: string; total: number } {
  const total = items.reduce((s, i) => s + i.balanceDue, 0);
  const lines = items.map((i) => `• ${i.invoiceNumber}: ₹${i.balanceDue.toLocaleString('en-IN')}`);
  const head =
    items.length === 1
      ? `You have 1 outstanding invoice (₹${total.toLocaleString('en-IN')}):`
      : `You have ${items.length} outstanding invoices totalling ₹${total.toLocaleString('en-IN')}:`;
  return { summary: `${head}\n${lines.join('\n')}`, total };
}
