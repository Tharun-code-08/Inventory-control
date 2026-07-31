/**
 * The invoice-dunning ladder expressed as a workflow graph (Plan §6, §8
 * "Dunning"). This is the system default seeded as WorkflowGraph(key=
 * "invoice-dunning", companyId=null); tenants may publish their own version.
 *
 * It replaces the hard-coded ladder with the same behaviour, but now as data:
 *
 *   T-3 reminder → wait → Paid? ─yes→ Close
 *                                └no → Due notice → wait → Paid? ─yes→ Close
 *   ... +3 firm → ... +7 final → ... → Manager → Legal → Close(unresolved)
 *
 * Every "Paid?" gate lets the thread stop-on-payment mid-ladder.
 */
import { WorkflowGraphDef } from './graph-types';

const paidGate = (key: string, whenPaid: string, whenUnpaid: string) => ({
  node: { key, kind: 'CONDITION' as const, label: 'Paid?', condition: { type: 'invoice.paid' } },
  edges: [
    { from: key, to: whenPaid, when: true },
    { from: key, to: whenUnpaid, when: false },
  ],
});

export const INVOICE_DUNNING_GRAPH: WorkflowGraphDef = (() => {
  const g1 = paidGate('gate-1', 'close-paid', 'due-notice');
  const g2 = paidGate('gate-2', 'close-paid', 'firm-3');
  const g3 = paidGate('gate-3', 'close-paid', 'final-7');
  const g4 = paidGate('gate-4', 'close-paid', 'escalate-manager');

  return {
    key: 'invoice-dunning',
    name: 'Invoice Dunning (default)',
    nodes: [
      { key: 'entry', kind: 'ENTRY', label: 'Invoice issued' },
      { key: 'pre-due', kind: 'ACTION', label: 'T-3 friendly reminder', action: { type: 'notify.customer', channel: 'AUTO', tone: 'friendly' } },
      { key: 'wait-1', kind: 'WAIT', waitHours: 72 },
      g1.node,
      { key: 'due-notice', kind: 'ACTION', label: 'Due-date notice', action: { type: 'notify.customer', channel: 'AUTO', tone: 'reminder' } },
      { key: 'wait-2', kind: 'WAIT', waitHours: 72 },
      g2.node,
      { key: 'firm-3', kind: 'ACTION', label: '+3 firm reminder', action: { type: 'notify.customer', channel: 'AUTO', tone: 'firm' } },
      { key: 'wait-3', kind: 'WAIT', waitHours: 96 },
      g3.node,
      { key: 'final-7', kind: 'ACTION', label: '+7 final notice', action: { type: 'notify.customer', channel: 'AUTO', tone: 'final' } },
      { key: 'wait-4', kind: 'WAIT', waitHours: 168 },
      g4.node,
      { key: 'escalate-manager', kind: 'ESCALATE', label: 'Escalate to manager', escalateTo: 'PURCHASE_MANAGER' },
      { key: 'escalate-legal', kind: 'ESCALATE', label: 'Escalate to legal', escalateTo: 'OWNER' },
      { key: 'close-paid', kind: 'TERMINAL', label: 'Closed — paid', terminalReason: 'paid' },
      { key: 'close-unresolved', kind: 'TERMINAL', label: 'Closed — unresolved', terminalReason: 'unresolved' },
    ],
    edges: [
      { from: 'entry', to: 'pre-due' },
      { from: 'pre-due', to: 'wait-1' },
      { from: 'wait-1', to: 'gate-1' },
      ...g1.edges,
      { from: 'due-notice', to: 'wait-2' },
      { from: 'wait-2', to: 'gate-2' },
      ...g2.edges,
      { from: 'firm-3', to: 'wait-3' },
      { from: 'wait-3', to: 'gate-3' },
      ...g3.edges,
      { from: 'final-7', to: 'wait-4' },
      { from: 'wait-4', to: 'gate-4' },
      ...g4.edges,
      { from: 'escalate-manager', to: 'escalate-legal' },
      { from: 'escalate-legal', to: 'close-unresolved' },
    ],
  };
})();

export const SYSTEM_WORKFLOWS: readonly WorkflowGraphDef[] = [INVOICE_DUNNING_GRAPH];
