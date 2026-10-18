import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import * as wf from '@/api/workflow-engine';

/**
 * Drag-and-drop workflow editor (Plan §5 "Workflow Builder"). Renders a
 * WorkflowGraphDef as a draggable graph: nodes can be repositioned, edges drawn
 * between them, nodes added/removed, and the result published (the server
 * compiles + validates it into a new immutable version).
 *
 * The authored graph def is the source of truth for node kinds/actions;
 * positions are view-only session state. Connecting out of a CONDITION node
 * prompts for the true/false branch so the compiler's branch rule is satisfied.
 */
const KIND_COLOR: Record<string, string> = {
  ENTRY: '#16a34a',
  ACTION: '#6366f1',
  CONDITION: '#d97706',
  WAIT: '#0891b2',
  ESCALATE: '#dc2626',
  TERMINAL: '#4b5563',
};

export function WorkflowCanvas({ initial }: { initial: wf.WorkflowGraphDef }) {
  const [def, setDef] = useState<wf.WorkflowGraphDef>(initial);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const nodes: Node[] = useMemo(
    () =>
      def.nodes.map((n, i) => ({
        id: n.key,
        data: { label: `${n.kind}: ${n.label ?? n.key}` },
        position: positions[n.key] ?? { x: (i % 2) * 260 + 40, y: Math.floor(i / 1) * 80 + 20 },
        style: {
          borderLeft: `4px solid ${KIND_COLOR[n.kind] ?? '#888'}`,
          borderRadius: 6,
          padding: 6,
          fontSize: 12,
          background: 'white',
        },
      })),
    [def, positions],
  );

  const edges: Edge[] = useMemo(
    () =>
      def.edges.map((e, i) => ({
        id: `e${i}-${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        label: e.when === true ? 'yes' : e.when === false ? 'no' : undefined,
        animated: e.when === undefined,
      })),
    [def],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const next = applyNodeChanges(changes, nodes);
    setPositions(Object.fromEntries(next.map((n) => [n.id, n.position])));
  }, [nodes]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    setDef((d) => {
      const src = d.nodes.find((n) => n.key === c.source);
      let when: boolean | undefined;
      if (src?.kind === 'CONDITION') {
        when = window.confirm('True (paid/yes) branch? Cancel = false branch.');
      }
      return { ...d, edges: [...d.edges, { from: c.source!, to: c.target!, when }] };
    });
  }, []);

  const addNode = (kind: wf.WorkflowNodeDef['kind']) => {
    const key = `${kind.toLowerCase()}-${def.nodes.length + 1}`;
    const node: wf.WorkflowNodeDef =
      kind === 'ACTION'
        ? { key, kind, action: { type: 'notify.customer', channel: 'AUTO', tone: 'reminder' } }
        : kind === 'CONDITION'
          ? { key, kind, action: undefined, label: 'Paid?' }
          : kind === 'WAIT'
            ? { key, kind, waitHours: 72 }
            : kind === 'TERMINAL'
              ? { key, kind, terminalReason: 'resolved' }
              : { key, kind };
    setDef((d) => ({ ...d, nodes: [...d.nodes, node] }));
  };

  const publish = async () => {
    try {
      await wf.publishWorkflow(def.key, def);
      toast.success('Workflow published (compiled + validated → new version)');
    } catch (e) {
      toast.error(`Publish failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(['ACTION', 'CONDITION', 'WAIT', 'ESCALATE', 'TERMINAL'] as const).map((k) => (
          <Button key={k} size="sm" variant="outline" onClick={() => addNode(k)}>+ {k}</Button>
        ))}
        <Button size="sm" onClick={publish}>Publish</Button>
      </div>
      <div style={{ height: 460 }} className="border rounded">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onConnect={onConnect} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <p className="text-xs text-muted-foreground">
        Drag nodes to arrange · drag from a node handle to another to connect · CONDITION nodes prompt for the branch · Publish compiles &amp; validates server-side.
      </p>
    </div>
  );
}
