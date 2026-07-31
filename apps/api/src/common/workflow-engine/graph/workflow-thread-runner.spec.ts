import { advanceThread, ThreadFacts } from './workflow-thread-runner';
import { compileWorkflow } from './workflow-compiler';
import { INVOICE_DUNNING_GRAPH } from './default-workflows';
import { CompiledWorkflow } from './graph-types';

function wf(): CompiledWorkflow {
  const r = compileWorkflow(INVOICE_DUNNING_GRAPH);
  if (!r.ok) throw new Error('fixture must compile');
  return r.workflow;
}

const unpaid: ThreadFacts = { invoicePaid: false, customerReplied: false };
const paid: ThreadFacts = { invoicePaid: true, customerReplied: false };
const now = new Date('2026-01-01T00:00:00Z');

describe('advanceThread', () => {
  it('first tick fires the pre-due reminder and parks at the first wait', () => {
    const adv = advanceThread(wf(), null, unpaid, now);
    expect(adv.effects).toHaveLength(1);
    expect(adv.effects[0]).toMatchObject({ kind: 'ACTION', nodeKey: 'pre-due' });
    expect(adv.park.kind).toBe('WAIT');
    if (adv.park.kind === 'WAIT') {
      expect(adv.park.nextNodeId).toBe('gate-1');
      expect(adv.park.resumeAt.getTime()).toBe(new Date('2026-01-04T00:00:00Z').getTime());
    }
  });

  it('resuming at a paid gate terminates with reason=paid and fires nothing', () => {
    const adv = advanceThread(wf(), 'gate-1', paid, now);
    expect(adv.effects).toHaveLength(0);
    expect(adv.park.kind).toBe('TERMINAL');
    if (adv.park.kind === 'TERMINAL') expect(adv.park.reason).toBe('paid');
  });

  it('resuming at a gate while unpaid fires the next reminder and parks again', () => {
    const adv = advanceThread(wf(), 'gate-1', unpaid, now);
    expect(adv.effects[0]).toMatchObject({ kind: 'ACTION', nodeKey: 'due-notice' });
    expect(adv.park.kind).toBe('WAIT');
  });

  it('drives through to escalation when the customer never pays', () => {
    // Walk the graph tick-by-tick from the start until it terminates.
    let cursor: string | null = null;
    const fired: string[] = [];
    let escalated = false;
    let reason = '';
    for (let i = 0; i < 20; i++) {
      const adv = advanceThread(wf(), cursor, unpaid, now);
      for (const e of adv.effects) {
        if (e.kind === 'ACTION') fired.push(e.nodeKey);
        if (e.kind === 'ESCALATE') escalated = true;
      }
      if (adv.park.kind === 'TERMINAL') {
        reason = adv.park.reason;
        break;
      }
      cursor = adv.park.nextNodeId;
    }
    expect(fired).toEqual(['pre-due', 'due-notice', 'firm-3', 'final-7']);
    expect(escalated).toBe(true);
    expect(reason).toBe('unresolved');
  });
});
