import { compileWorkflow } from './workflow-compiler';
import { driveWorkflow, RuntimeContext, stepFrom } from './workflow-runtime';
import { INVOICE_DUNNING_GRAPH } from './default-workflows';
import { CompiledWorkflow } from './graph-types';

function compiled(): CompiledWorkflow {
  const r = compileWorkflow(INVOICE_DUNNING_GRAPH);
  if (!r.ok) throw new Error('fixture graph should compile');
  return r.workflow;
}

const ctx = (paid: boolean, now = new Date('2026-01-01T00:00:00Z')): RuntimeContext => ({
  now,
  evalCondition: () => paid,
});

describe('stepFrom', () => {
  it('starts at the first action (T-3 reminder)', () => {
    const wf = compiled();
    const step = stepFrom(wf, wf.entryKey, ctx(false));
    expect(step.kind).toBe('ACTION');
    if (step.kind === 'ACTION') {
      expect(step.nodeKey).toBe('pre-due');
      expect(step.action.tone).toBe('friendly');
    }
  });

  it('pauses at a WAIT with the correct resume time', () => {
    const wf = compiled();
    const first = stepFrom(wf, wf.entryKey, ctx(false));
    if (first.kind !== 'ACTION') throw new Error('expected action');
    const wait = stepFrom(wf, first.nextKey, ctx(false));
    expect(wait.kind).toBe('WAIT');
    if (wait.kind === 'WAIT') {
      expect(wait.resumeAt.getTime()).toBe(new Date('2026-01-04T00:00:00Z').getTime());
    }
  });
});

describe('driveWorkflow', () => {
  it('stops at close-paid as soon as the invoice is paid', () => {
    const wf = compiled();
    const steps = driveWorkflow(wf, (now) => ctx(true, now), { start: new Date('2026-01-01T00:00:00Z') });
    const last = steps[steps.length - 1];
    expect(last.result.kind).toBe('TERMINAL');
    if (last.result.kind === 'TERMINAL') expect(last.result.reason).toBe('paid');
    // First action fires, then the very first gate closes it.
    expect(steps.filter((s) => s.result.kind === 'ACTION').length).toBe(1);
  });

  it('walks the full ladder to escalation when never paid', () => {
    const wf = compiled();
    const steps = driveWorkflow(wf, (now) => ctx(false, now), { start: new Date('2026-01-01T00:00:00Z') });
    const last = steps[steps.length - 1];
    expect(last.result.kind).toBe('TERMINAL');
    if (last.result.kind === 'TERMINAL') expect(last.result.reason).toBe('unresolved');
    expect(steps.some((s) => s.result.kind === 'ESCALATE')).toBe(true);
    // 4 customer messages: pre-due, due, firm, final.
    expect(steps.filter((s) => s.result.kind === 'ACTION').length).toBe(4);
  });
});
