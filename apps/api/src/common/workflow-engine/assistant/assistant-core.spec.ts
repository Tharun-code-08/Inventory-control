import { draftMessage, suggestEscalation, summarizeTimeline } from './assistant-core';

describe('assistant-core', () => {
  it('drafts tone-appropriate messages including the amount', () => {
    const friendly = draftMessage({ tone: 'friendly', invoiceNumber: 'INV-1', balanceDue: 5000, customerName: 'Asha' });
    expect(friendly).toMatch(/Hi Asha/);
    expect(friendly).toMatch(/₹5,000/);
    const final = draftMessage({ tone: 'final', invoiceNumber: 'INV-1', balanceDue: 5000 });
    expect(final).toMatch(/final notice/i);
  });

  it('summarises a timeline with counts and outcome', () => {
    const s = summarizeTimeline([
      { kind: 'SENT', occurredAt: new Date('2026-01-01') },
      { kind: 'SENT', occurredAt: new Date('2026-01-04') },
      { kind: 'PAID', occurredAt: new Date('2026-01-06') },
    ]);
    expect(s).toMatch(/2× sent/);
    expect(s).toMatch(/Resolved \(paid\)/);
  });

  it('summarises an empty timeline gracefully', () => {
    expect(summarizeTimeline([])).toMatch(/No activity/);
  });

  it('suggests escalation for long-overdue low-likelihood accounts', () => {
    expect(suggestEscalation({ daysOverdue: 30, balanceDue: 20000, paymentLikelihood: 0.2, remindersSent: 3 }).suggest).toBe(true);
    expect(suggestEscalation({ daysOverdue: 3, balanceDue: 20000, paymentLikelihood: 0.8, remindersSent: 1 }).suggest).toBe(false);
  });
});
