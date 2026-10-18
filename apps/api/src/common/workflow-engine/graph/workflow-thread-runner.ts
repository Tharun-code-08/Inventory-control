/**
 * Graph execution core (Plan §6) — pure. Advances a single followup thread
 * through a {@link CompiledWorkflow} for one sweep tick: from the node it is
 * currently entering, it fires every ACTION/ESCALATE it passes and then parks at
 * the next WAIT (with the resume time) or TERMINAL (with the resolution).
 *
 * This is the piece that lets a workflow *graph* drive dunning instead of the
 * hard-coded ladder: the executor stores the parked node key on
 * `FollowupThread.currentNodeId` and calls back in when `nextActionAt` is due.
 * Kept pure (no NestJS/Prisma) so the traversal is fully unit-tested.
 */
import { ActionSpec, CompiledWorkflow, ConditionSpec } from './graph-types';
import { stepFrom } from './workflow-runtime';

/** The live facts a CONDITION node is evaluated against (from invoice + thread). */
export interface ThreadFacts {
  readonly invoicePaid: boolean;
  readonly customerReplied: boolean;
  readonly amount?: number;
  readonly daysOverdue?: number;
  /** Extra named booleans for custom conditions (officeHours, approvalReceived…). */
  readonly flags?: Readonly<Record<string, boolean>>;
}

export interface AdvanceOptions {
  /**
   * Pluggable condition evaluator (Plan §5). Defaults to the built-in
   * invoice.paid / customer.replied / flags evaluator; the executor passes a
   * {@link ConditionRegistry}-backed one so custom conditions work live.
   */
  readonly evaluate?: (spec: ConditionSpec, facts: ThreadFacts, now: Date) => boolean;
  readonly maxEffects?: number;
}

export type GraphEffect =
  | { readonly kind: 'ACTION'; readonly nodeKey: string; readonly action: ActionSpec }
  | { readonly kind: 'ESCALATE'; readonly nodeKey: string; readonly escalateTo: string };

export type ParkState =
  | { readonly kind: 'WAIT'; readonly nodeKey: string; readonly resumeAt: Date; readonly nextNodeId: string }
  | { readonly kind: 'TERMINAL'; readonly nodeKey: string; readonly reason: string };

export interface ThreadAdvance {
  /** ACTION/ESCALATE effects passed on this tick, in order (usually one). */
  readonly effects: GraphEffect[];
  /** Where the thread comes to rest until its next tick. */
  readonly park: ParkState;
}

/** Built-in fallback evaluator. Unknown types resolve from facts.flags, else false. */
function defaultEvaluate(spec: ConditionSpec, facts: ThreadFacts): boolean {
  switch (spec.type) {
    case 'invoice.paid':
      return facts.invoicePaid;
    case 'customer.replied':
      return facts.customerReplied;
    default:
      return facts.flags?.[spec.type] ?? false;
  }
}

/**
 * Advance a thread one tick. `cursor` is the node to enter (null on first run →
 * the workflow's ENTRY). Returns the effects to execute and the park state to
 * persist. Bounded by `maxEffects` so a misconfigured graph can never spin.
 */
export function advanceThread(
  workflow: CompiledWorkflow,
  cursor: string | null,
  facts: ThreadFacts,
  now: Date,
  opts: AdvanceOptions = {},
): ThreadAdvance {
  const maxEffects = opts.maxEffects ?? 16;
  const evaluate = opts.evaluate ?? defaultEvaluate;
  const ctx = { now, evalCondition: (spec: ConditionSpec) => evaluate(spec, facts, now) };
  const effects: GraphEffect[] = [];
  let enter = cursor ?? workflow.entryKey;

  for (let i = 0; i <= maxEffects; i++) {
    const step = stepFrom(workflow, enter, ctx);
    if (step.kind === 'ACTION') {
      effects.push({ kind: 'ACTION', nodeKey: step.nodeKey, action: step.action });
      enter = step.nextKey;
      continue;
    }
    if (step.kind === 'ESCALATE') {
      effects.push({ kind: 'ESCALATE', nodeKey: step.nodeKey, escalateTo: step.escalateTo });
      enter = step.nextKey;
      continue;
    }
    if (step.kind === 'WAIT') {
      return { effects, park: { kind: 'WAIT', nodeKey: step.nodeKey, resumeAt: step.resumeAt, nextNodeId: step.nextKey } };
    }
    return { effects, park: { kind: 'TERMINAL', nodeKey: step.nodeKey, reason: step.reason } };
  }
  // Defensive: an acyclic compiled graph cannot reach here.
  return { effects, park: { kind: 'TERMINAL', nodeKey: enter, reason: 'guard:max-effects' } };
}
