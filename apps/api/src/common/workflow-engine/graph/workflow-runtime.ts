/**
 * Workflow runtime (Plan §6). Pure step function over a {@link CompiledWorkflow}.
 * It never sends anything and never touches the DB — it decides *what should
 * happen next* given the node a thread is currently entering and a context that
 * can evaluate conditions and tell the time.
 *
 * ENTRY and CONDITION nodes are internal routing and are traversed silently;
 * the function returns only at a node that needs an external effect (ACTION,
 * ESCALATE), a pause (WAIT), or an end (TERMINAL). The caller performs the
 * effect, persists `nextKey` as the thread cursor, and calls again.
 */
import { ActionSpec, CompiledWorkflow, ConditionSpec } from './graph-types';

export interface RuntimeContext {
  /** Evaluate a CONDITION node. Deterministic for a given thread snapshot. */
  readonly evalCondition: (spec: ConditionSpec) => boolean;
  /** "Now" for computing WAIT resume times. */
  readonly now: Date;
}

export type StepResult =
  | { readonly kind: 'ACTION'; readonly nodeKey: string; readonly action: ActionSpec; readonly nextKey: string }
  | { readonly kind: 'ESCALATE'; readonly nodeKey: string; readonly escalateTo: string; readonly nextKey: string }
  | { readonly kind: 'WAIT'; readonly nodeKey: string; readonly resumeAt: Date; readonly nextKey: string }
  | { readonly kind: 'TERMINAL'; readonly nodeKey: string; readonly reason: string };

const HOUR_MS = 60 * 60 * 1000;

/** Resolve the single outgoing edge target, or null if there is none. */
function soleTarget(workflow: CompiledWorkflow, key: string): string | null {
  const edges = workflow.adjacency[key] ?? [];
  return edges.length === 1 ? edges[0].to : null;
}

/** Resolve the branch (when:true/false) target of a CONDITION node. */
function branchTarget(workflow: CompiledWorkflow, key: string, branch: boolean): string | null {
  const edge = (workflow.adjacency[key] ?? []).find((e) => e.when === branch);
  return edge?.to ?? null;
}

/**
 * Advance from `enterKey` to the next externally-meaningful step. Pass the
 * workflow's `entryKey` on the first call and the previous result's `nextKey`
 * thereafter. Compiled workflows are guaranteed well-formed, so the defensive
 * TERMINAL fallbacks below should never fire in practice.
 */
export function stepFrom(workflow: CompiledWorkflow, enterKey: string, ctx: RuntimeContext): StepResult {
  let key = enterKey;
  // Bounded by node count: routing nodes are visited at most once on an acyclic
  // graph, so this cannot loop forever.
  for (let guard = 0; guard <= workflow.order.length; guard++) {
    const node = workflow.nodes[key];
    if (!node) return { kind: 'TERMINAL', nodeKey: key, reason: 'dead-end:unknown-node' };

    switch (node.kind) {
      case 'ENTRY': {
        const next = soleTarget(workflow, key);
        if (!next) return { kind: 'TERMINAL', nodeKey: key, reason: 'dead-end:entry' };
        key = next;
        break;
      }
      case 'CONDITION': {
        const branch = ctx.evalCondition(node.condition as ConditionSpec);
        const next = branchTarget(workflow, key, branch);
        if (!next) return { kind: 'TERMINAL', nodeKey: key, reason: 'dead-end:condition' };
        key = next;
        break;
      }
      case 'ACTION':
        return {
          kind: 'ACTION',
          nodeKey: key,
          action: node.action as ActionSpec,
          nextKey: soleTarget(workflow, key) ?? key,
        };
      case 'ESCALATE':
        return {
          kind: 'ESCALATE',
          nodeKey: key,
          escalateTo: node.escalateTo ?? 'manager',
          nextKey: soleTarget(workflow, key) ?? key,
        };
      case 'WAIT':
        return {
          kind: 'WAIT',
          nodeKey: key,
          resumeAt: new Date(ctx.now.getTime() + (node.waitHours ?? 0) * HOUR_MS),
          nextKey: soleTarget(workflow, key) ?? key,
        };
      case 'TERMINAL':
        return { kind: 'TERMINAL', nodeKey: key, reason: node.terminalReason ?? 'resolved' };
    }
  }
  return { kind: 'TERMINAL', nodeKey: key, reason: 'dead-end:guard' };
}

/**
 * Drive a workflow to completion in memory (used by the simulation engine and
 * tests). Performs no side effects: ACTION/ESCALATE steps are collected, WAIT
 * advances a simulated clock, and conditions are re-evaluated at each step so a
 * caller can model "paid on day N". Bounded by `maxSteps`.
 */
export interface DriveStep {
  readonly at: Date;
  readonly result: StepResult;
}

export function driveWorkflow(
  workflow: CompiledWorkflow,
  makeContext: (now: Date) => RuntimeContext,
  opts: { readonly start: Date; readonly maxSteps?: number },
): DriveStep[] {
  const maxSteps = opts.maxSteps ?? 100;
  const steps: DriveStep[] = [];
  let cursor = workflow.entryKey;
  let clock = opts.start;

  for (let i = 0; i < maxSteps; i++) {
    const result = stepFrom(workflow, cursor, makeContext(clock));
    steps.push({ at: clock, result });
    if (result.kind === 'TERMINAL') break;
    if (result.kind === 'WAIT') clock = result.resumeAt;
    cursor = result.nextKey;
  }
  return steps;
}
