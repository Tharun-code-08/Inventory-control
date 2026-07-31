/**
 * Workflow compiler (Plan §10 "Workflow Compiler"). Pure: takes an authored
 * {@link WorkflowGraphDef} and either returns a {@link CompiledWorkflow} or the
 * list of {@link CompileError}s that make it invalid. Running this at publish
 * time is what lets us *freeze* a valid graph as an immutable version.
 *
 * Validation rules:
 *  - exactly one ENTRY node,
 *  - every edge references existing nodes,
 *  - ENTRY has no inbound edges; TERMINAL has no outbound edges,
 *  - CONDITION nodes have exactly one `when:true` and one `when:false` edge,
 *  - non-CONDITION, non-TERMINAL nodes have exactly one outbound edge,
 *  - node-kind payloads are present (ACTION.action, CONDITION.condition, …),
 *  - every node is reachable from ENTRY,
 *  - the graph is acyclic (no infinite workflow loops).
 */
import {
  CompiledWorkflow,
  CompileError,
  WorkflowEdgeDef,
  WorkflowGraphDef,
  WorkflowNodeDef,
} from './graph-types';

export type CompileResult =
  | { readonly ok: true; readonly workflow: CompiledWorkflow }
  | { readonly ok: false; readonly errors: readonly CompileError[] };

export function compileWorkflow(def: WorkflowGraphDef): CompileResult {
  const errors: CompileError[] = [];
  const nodes: Record<string, WorkflowNodeDef> = {};

  // 1. Node uniqueness + per-kind payload checks.
  for (const node of def.nodes) {
    if (nodes[node.key]) {
      errors.push({ code: 'DUPLICATE_NODE', message: `Duplicate node key "${node.key}".`, nodeKey: node.key });
      continue;
    }
    nodes[node.key] = node;
    if (node.kind === 'ACTION' && !node.action) {
      errors.push({ code: 'MISSING_ACTION', message: `ACTION node "${node.key}" has no action.`, nodeKey: node.key });
    }
    if (node.kind === 'CONDITION' && !node.condition) {
      errors.push({ code: 'MISSING_CONDITION', message: `CONDITION node "${node.key}" has no condition.`, nodeKey: node.key });
    }
    if (node.kind === 'WAIT' && (node.waitHours == null || node.waitHours < 0)) {
      errors.push({ code: 'BAD_WAIT', message: `WAIT node "${node.key}" needs waitHours >= 0.`, nodeKey: node.key });
    }
  }

  // 2. Exactly one ENTRY.
  const entries = def.nodes.filter((n) => n.kind === 'ENTRY');
  if (entries.length !== 1) {
    errors.push({ code: 'ENTRY_COUNT', message: `Expected exactly 1 ENTRY node, found ${entries.length}.` });
  }
  const entryKey = entries[0]?.key ?? '';

  // 3. Edges reference known nodes; build adjacency + indegree.
  const adjacency: Record<string, WorkflowEdgeDef[]> = {};
  const indegree: Record<string, number> = {};
  for (const key of Object.keys(nodes)) {
    adjacency[key] = [];
    indegree[key] = 0;
  }
  for (const edge of def.edges) {
    if (!nodes[edge.from]) {
      errors.push({ code: 'EDGE_FROM_UNKNOWN', message: `Edge from unknown node "${edge.from}".` });
      continue;
    }
    if (!nodes[edge.to]) {
      errors.push({ code: 'EDGE_TO_UNKNOWN', message: `Edge to unknown node "${edge.to}".` });
      continue;
    }
    adjacency[edge.from].push(edge);
    indegree[edge.to] += 1;
  }

  // 4. Structural degree rules per node kind.
  for (const node of Object.values(nodes)) {
    const out = adjacency[node.key] ?? [];
    if (node.kind === 'ENTRY' && indegree[node.key] > 0) {
      errors.push({ code: 'ENTRY_INBOUND', message: `ENTRY node "${node.key}" must have no inbound edges.`, nodeKey: node.key });
    }
    if (node.kind === 'TERMINAL') {
      if (out.length > 0) {
        errors.push({ code: 'TERMINAL_OUTBOUND', message: `TERMINAL node "${node.key}" must have no outbound edges.`, nodeKey: node.key });
      }
      continue;
    }
    if (node.kind === 'CONDITION') {
      const t = out.filter((e) => e.when === true).length;
      const f = out.filter((e) => e.when === false).length;
      if (t !== 1 || f !== 1 || out.length !== 2) {
        errors.push({
          code: 'CONDITION_BRANCHES',
          message: `CONDITION node "${node.key}" needs exactly one when:true and one when:false edge.`,
          nodeKey: node.key,
        });
      }
      continue;
    }
    // ENTRY / ACTION / WAIT / ESCALATE: exactly one outbound edge.
    if (out.length !== 1) {
      errors.push({
        code: 'OUT_DEGREE',
        message: `Node "${node.key}" (${node.kind}) must have exactly one outbound edge, found ${out.length}.`,
        nodeKey: node.key,
      });
    }
  }

  // 5. Reachability from ENTRY.
  if (entryKey) {
    const seen = new Set<string>();
    const stack = [entryKey];
    while (stack.length) {
      const cur = stack.pop() as string;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const e of adjacency[cur] ?? []) stack.push(e.to);
    }
    for (const key of Object.keys(nodes)) {
      if (!seen.has(key)) {
        errors.push({ code: 'UNREACHABLE', message: `Node "${key}" is unreachable from ENTRY.`, nodeKey: key });
      }
    }
  }

  // 6. Acyclicity via Kahn's algorithm on a copy of indegree.
  const order = topoOrder(nodes, adjacency, indegree);
  if (order === null) {
    errors.push({ code: 'CYCLE', message: 'Workflow graph contains a cycle; graphs must be acyclic.' });
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    workflow: {
      key: def.key,
      name: def.name,
      entryKey,
      nodes,
      adjacency,
      order: order ?? [],
    },
  };
}

/** Kahn topological sort; returns null if a cycle is present. */
function topoOrder(
  nodes: Record<string, WorkflowNodeDef>,
  adjacency: Record<string, WorkflowEdgeDef[]>,
  indegree: Record<string, number>,
): string[] | null {
  const deg = { ...indegree };
  const queue = Object.keys(nodes).filter((k) => deg[k] === 0);
  const order: string[] = [];
  while (queue.length) {
    const cur = queue.shift() as string;
    order.push(cur);
    for (const e of adjacency[cur] ?? []) {
      deg[e.to] -= 1;
      if (deg[e.to] === 0) queue.push(e.to);
    }
  }
  return order.length === Object.keys(nodes).length ? order : null;
}
