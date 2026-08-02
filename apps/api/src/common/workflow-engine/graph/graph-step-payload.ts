/**
 * Map a graph ACTION/ESCALATE node into the `invoice.dunning-step` event payload
 * the existing dispatch pipeline already consumes (Plan §6 → §11). Keeping the
 * event contract unchanged means the graph executor reuses the whole
 * consent → policy → routing → ledger path with zero changes to CustomerDispatch.
 */
import { DunningChannel, DunningTone } from '../dunning';
import { DunningStepEventPayload } from '../dunning-delivery';
import { ActionSpec } from './graph-types';

/** Map a dunning tone to the nearest ladder step index (drives priority reuse). */
export const TONE_TO_STEP_INDEX: Readonly<Record<string, number>> = {
  friendly: 0,
  reminder: 1,
  firm: 2,
  final: 3,
  escalation: 4,
};

export interface StepContext {
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly customerId: string;
  readonly balanceDue: number;
  readonly daysFromDue: number;
}

/** A customer-facing ACTION node → dunning-step payload. */
export function graphActionToStepPayload(action: ActionSpec, ctx: StepContext): DunningStepEventPayload {
  const tone = (action.tone as DunningTone) ?? 'reminder';
  const channels: DunningChannel[] =
    action.channel && action.channel !== 'AUTO'
      ? [action.channel as DunningChannel]
      : ['WHATSAPP', 'EMAIL'];
  return {
    invoiceId: ctx.invoiceId,
    invoiceNumber: ctx.invoiceNumber,
    customerId: ctx.customerId,
    stepIndex: TONE_TO_STEP_INDEX[tone] ?? 1,
    tone,
    audience: 'customer',
    daysFromDue: ctx.daysFromDue,
    balanceDue: ctx.balanceDue,
    channels,
  };
}

/** An ESCALATE node → staff dunning-step payload (IN_APP fan-out to managers). */
export function graphEscalateToStepPayload(ctx: StepContext): DunningStepEventPayload {
  return {
    invoiceId: ctx.invoiceId,
    invoiceNumber: ctx.invoiceNumber,
    customerId: ctx.customerId,
    stepIndex: 4,
    tone: 'escalation',
    audience: 'staff',
    daysFromDue: ctx.daysFromDue,
    balanceDue: ctx.balanceDue,
    channels: ['IN_APP'],
  };
}
