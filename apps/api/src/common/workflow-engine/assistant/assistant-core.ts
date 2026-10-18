/**
 * Autonomous assistant core (Plan Phase 7) — pure. Drafts messages, summarises a
 * thread's timeline, and suggests escalations. Everything it produces is a
 * *proposal*: the plan requires human approval before execution, so these
 * functions never send anything — they return text/decisions for review.
 *
 * Deterministic today (no LLM key needed); the same functions are the seam a
 * real model plugs into later.
 */
export type AssistantTone = 'friendly' | 'reminder' | 'firm' | 'final' | 'escalation';

export interface DraftInput {
  readonly tone: AssistantTone;
  readonly invoiceNumber: string;
  readonly balanceDue: number;
  readonly customerName?: string;
  readonly dueInDays?: number;
}

const money = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

export function draftMessage(input: DraftInput): string {
  const who = input.customerName ? `Hi ${input.customerName},` : 'Hello,';
  const amt = money(input.balanceDue);
  switch (input.tone) {
    case 'friendly':
      return `${who} a quick reminder that invoice ${input.invoiceNumber} for ${amt} is coming up. Thank you for your business!`;
    case 'reminder':
      return `${who} invoice ${input.invoiceNumber} for ${amt} is now due. Please arrange payment at your convenience.`;
    case 'firm':
      return `${who} invoice ${input.invoiceNumber} for ${amt} is overdue. Kindly settle it to avoid further follow-up.`;
    case 'final':
      return `${who} this is a final notice for invoice ${input.invoiceNumber} (${amt}), now significantly overdue. Please pay immediately.`;
    case 'escalation':
      return `${who} invoice ${input.invoiceNumber} (${amt}) remains unpaid and is being escalated. Please contact us urgently to resolve this.`;
  }
}

export interface TimelineEntryLite {
  readonly kind: string;
  readonly channel?: string | null;
  readonly occurredAt: Date;
}

/** A short human-readable summary of what has happened on a thread. */
export function summarizeTimeline(entries: readonly TimelineEntryLite[]): string {
  if (entries.length === 0) return 'No activity recorded yet.';
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  const parts = [...counts.entries()].map(([kind, n]) => `${n}× ${kind.toLowerCase()}`);
  const first = entries[0].occurredAt.toISOString().slice(0, 10);
  const last = entries[entries.length - 1].occurredAt.toISOString().slice(0, 10);
  const paid = counts.has('PAID');
  const outcome = paid ? 'Resolved (paid).' : counts.has('ESCALATED') ? 'Escalated, unresolved.' : 'In progress.';
  return `${entries.length} events from ${first} to ${last}: ${parts.join(', ')}. ${outcome}`;
}

export interface EscalationFacts {
  readonly daysOverdue: number;
  readonly balanceDue: number;
  readonly paymentLikelihood: number; // 0..1
  readonly remindersSent: number;
}

/** Suggest whether to escalate to a human, with a reason (no action taken). */
export function suggestEscalation(f: EscalationFacts): { suggest: boolean; reason: string } {
  if (f.daysOverdue > 21 && f.paymentLikelihood < 0.3) {
    return { suggest: true, reason: `${f.daysOverdue}d overdue, low likelihood (${f.paymentLikelihood})` };
  }
  if (f.balanceDue >= 100_000 && f.remindersSent >= 3 && f.paymentLikelihood < 0.4) {
    return { suggest: true, reason: 'high value, multiple reminders, weak likelihood' };
  }
  return { suggest: false, reason: 'continue automated follow-up' };
}
