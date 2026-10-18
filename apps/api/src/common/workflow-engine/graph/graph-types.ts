/**
 * Workflow graph types (Plan §6). A workflow is a versioned directed graph of
 * nodes and edges. These are pure data types — no NestJS, no Prisma — so the
 * compiler and runtime below stay unit-testable and side-effect free.
 *
 * The same shapes are persisted as `WorkflowVersion.document` (Json) and, in a
 * denormalised form, as `WorkflowNode` rows.
 */

export type NodeKind =
  /** Single start node; where every run begins. */
  | 'ENTRY'
  /** Perform an Action (send a message, update CRM, call a webhook…). */
  | 'ACTION'
  /** Branch on a Condition; edges carry `when: true|false`. */
  | 'CONDITION'
  /** Pause until a relative delay elapses, then continue. */
  | 'WAIT'
  /** Hand off to a human/role (manager, legal). */
  | 'ESCALATE'
  /** Absorbing end state; a run that reaches here is finished. */
  | 'TERMINAL';

/** The Action a node performs. `type` is looked up in the Action registry. */
export interface ActionSpec {
  readonly type: string; // e.g. "notify.customer", "crm.update", "webhook"
  readonly channel?: string; // WHATSAPP | EMAIL | IN_APP | AUTO
  readonly tone?: string; // friendly | reminder | firm | final | escalation
  readonly params?: Readonly<Record<string, unknown>>;
}

/** The Condition a CONDITION node evaluates. `type` is looked up in the registry. */
export interface ConditionSpec {
  readonly type: string; // e.g. "invoice.paid", "customer.replied", "amount.gt"
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface WorkflowNodeDef {
  readonly key: string; // stable id within the graph
  readonly kind: NodeKind;
  readonly label?: string;
  /** ACTION nodes only. */
  readonly action?: ActionSpec;
  /** CONDITION nodes only. */
  readonly condition?: ConditionSpec;
  /** WAIT nodes only — delay before following the outgoing edge. */
  readonly waitHours?: number;
  /** ESCALATE nodes only — the role/queue to escalate to. */
  readonly escalateTo?: string;
  /** TERMINAL nodes only — resolution reason recorded on the thread. */
  readonly terminalReason?: string;
}

export interface WorkflowEdgeDef {
  readonly from: string; // source node key
  readonly to: string; // target node key
  /** For edges out of a CONDITION node: which branch this edge is. */
  readonly when?: boolean;
  readonly label?: string;
}

/** The authored graph, before compilation. */
export interface WorkflowGraphDef {
  readonly key: string; // e.g. "invoice-dunning"
  readonly name: string;
  readonly nodes: readonly WorkflowNodeDef[];
  readonly edges: readonly WorkflowEdgeDef[];
}

/** A single validation problem found by the compiler. */
export interface CompileError {
  readonly code: string;
  readonly message: string;
  readonly nodeKey?: string;
}

/**
 * A validated, execution-ready graph. `adjacency` maps a node key to its
 * outgoing edges; `entryKey` is the unique ENTRY node; `order` is a topological
 * ordering of the acyclic backbone (WAIT/CONDITION self-progress is allowed but
 * cycles through ACTION nodes are rejected).
 */
export interface CompiledWorkflow {
  readonly key: string;
  readonly name: string;
  readonly entryKey: string;
  readonly nodes: Readonly<Record<string, WorkflowNodeDef>>;
  readonly adjacency: Readonly<Record<string, readonly WorkflowEdgeDef[]>>;
  readonly order: readonly string[];
}
