import { RuleBasedAdvisor } from './ai-advisor';
import { EMPTY_ENGAGEMENT } from '../engagement';

describe('RuleBasedAdvisor', () => {
  const advisor = new RuleBasedAdvisor();

  it('recommends a friendly tone before the due date', () => {
    const rec = advisor.recommend({ companyId: 'c', customerId: 'u', daysOverdue: -3 });
    expect(rec.tone).toBe('friendly');
    expect(rec.escalate).toBe(false);
  });

  it('escalates a high-value, long-overdue, unreliable customer', () => {
    const engagement = { ...EMPTY_ENGAGEMENT, blocked: 1 }; // reliability floored to 0
    const rec = advisor.recommend({ companyId: 'c', customerId: 'u', amount: 200000, daysOverdue: 30, engagement });
    expect(rec.tone).toBe('escalation');
    expect(rec.escalate).toBe(true);
  });

  it('does not escalate a reliable customer even when overdue', () => {
    const engagement = { ...EMPTY_ENGAGEMENT, paidCount: 3, replies: 2 };
    const rec = advisor.recommend({ companyId: 'c', customerId: 'u', amount: 200000, daysOverdue: 30, engagement });
    expect(rec.escalate).toBe(false);
  });

  it('recommends the engagement-preferred channel with higher confidence', () => {
    const engagement = { ...EMPTY_ENGAGEMENT, whatsappSignals: 4, replies: 4 };
    const rec = advisor.recommend({ companyId: 'c', customerId: 'u', engagement });
    expect(rec.channel).toBe('WHATSAPP');
    expect(rec.confidence).toBeGreaterThan(30);
  });
});
