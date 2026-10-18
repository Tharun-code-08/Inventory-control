import { classifyStalled, DEFAULT_STALL_THRESHOLDS } from './dead-workflow';

describe('classifyStalled', () => {
  const now = new Date('2026-01-02T00:00:00Z');

  it('ignores non-active threads', () => {
    expect(classifyStalled({ state: 'RESOLVED', nextActionAt: new Date('2020-01-01'), updatedAt: now }, now)).toBe('healthy');
    expect(classifyStalled({ state: 'PAUSED', nextActionAt: new Date('2020-01-01'), updatedAt: now }, now)).toBe('healthy');
  });

  it('is healthy when the next action is not yet overdue enough', () => {
    const nextActionAt = new Date(now.getTime() - 10 * 60 * 1000); // 10 min past
    expect(classifyStalled({ state: 'ACTIVE', nextActionAt, updatedAt: now }, now)).toBe('healthy');
  });

  it('retries a moderately overdue thread', () => {
    const nextActionAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h past
    expect(classifyStalled({ state: 'ACTIVE', nextActionAt, updatedAt: now }, now)).toBe('retry');
  });

  it('escalates a badly overdue thread', () => {
    const nextActionAt = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48h past
    expect(classifyStalled({ state: 'ACTIVE', nextActionAt, updatedAt: now }, now)).toBe('escalate');
  });

  it('falls back to updatedAt when nextActionAt is null', () => {
    const updatedAt = new Date(now.getTime() - DEFAULT_STALL_THRESHOLDS.escalateAfterMs - 1000);
    expect(classifyStalled({ state: 'ACTIVE', nextActionAt: null, updatedAt }, now)).toBe('escalate');
  });
});
