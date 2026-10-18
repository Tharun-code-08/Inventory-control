import { compileWorkflow } from './workflow-compiler';
import { INVOICE_DUNNING_GRAPH } from './default-workflows';
import { WorkflowGraphDef } from './graph-types';

describe('compileWorkflow', () => {
  it('compiles the default invoice-dunning graph', () => {
    const res = compileWorkflow(INVOICE_DUNNING_GRAPH);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.workflow.entryKey).toBe('entry');
      expect(res.workflow.order.length).toBe(INVOICE_DUNNING_GRAPH.nodes.length);
    }
  });

  const base: WorkflowGraphDef = {
    key: 'k',
    name: 'n',
    nodes: [
      { key: 'e', kind: 'ENTRY' },
      { key: 'a', kind: 'ACTION', action: { type: 'x' } },
      { key: 't', kind: 'TERMINAL', terminalReason: 'done' },
    ],
    edges: [
      { from: 'e', to: 'a' },
      { from: 'a', to: 't' },
    ],
  };

  it('accepts a minimal valid graph', () => {
    expect(compileWorkflow(base).ok).toBe(true);
  });

  it('rejects zero and multiple ENTRY nodes', () => {
    const two = { ...base, nodes: [...base.nodes, { key: 'e2', kind: 'ENTRY' as const }] };
    const r = compileWorkflow(two);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'ENTRY_COUNT')).toBe(true);
  });

  it('rejects an ACTION node without an action', () => {
    const bad = {
      ...base,
      nodes: [
        { key: 'e', kind: 'ENTRY' as const },
        { key: 'a', kind: 'ACTION' as const },
        { key: 't', kind: 'TERMINAL' as const },
      ],
    };
    const r = compileWorkflow(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'MISSING_ACTION')).toBe(true);
  });

  it('rejects an edge to an unknown node', () => {
    const bad = { ...base, edges: [{ from: 'e', to: 'nope' }, { from: 'a', to: 't' }] };
    const r = compileWorkflow(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'EDGE_TO_UNKNOWN')).toBe(true);
  });

  it('rejects a cycle', () => {
    const cyc: WorkflowGraphDef = {
      key: 'k',
      name: 'n',
      nodes: [
        { key: 'e', kind: 'ENTRY' },
        { key: 'a', kind: 'ACTION', action: { type: 'x' } },
        { key: 'b', kind: 'ACTION', action: { type: 'y' } },
      ],
      edges: [
        { from: 'e', to: 'a' },
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ],
    };
    const r = compileWorkflow(cyc);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'CYCLE')).toBe(true);
  });

  it('rejects an unreachable node', () => {
    const bad: WorkflowGraphDef = {
      key: 'k',
      name: 'n',
      nodes: [
        { key: 'e', kind: 'ENTRY' },
        { key: 'a', kind: 'ACTION', action: { type: 'x' } },
        { key: 't', kind: 'TERMINAL', terminalReason: 'd' },
        { key: 'orphan', kind: 'TERMINAL', terminalReason: 'o' },
      ],
      edges: [
        { from: 'e', to: 'a' },
        { from: 'a', to: 't' },
      ],
    };
    const r = compileWorkflow(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'UNREACHABLE')).toBe(true);
  });

  it('rejects a CONDITION node without both branches', () => {
    const bad: WorkflowGraphDef = {
      key: 'k',
      name: 'n',
      nodes: [
        { key: 'e', kind: 'ENTRY' },
        { key: 'c', kind: 'CONDITION', condition: { type: 'q' } },
        { key: 't', kind: 'TERMINAL', terminalReason: 'd' },
      ],
      edges: [
        { from: 'e', to: 'c' },
        { from: 'c', to: 't', when: true },
      ],
    };
    const r = compileWorkflow(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'CONDITION_BRANCHES')).toBe(true);
  });
});
