import { churnRisk, collectionForecast, nextBestAction, paymentLikelihood } from './predictive-models';

describe('predictive-models', () => {
  it('paymentLikelihood rewards reliability and penalises overdue', () => {
    const reliable = paymentLikelihood({ reliability: 90, daysOverdue: 0, balanceDue: 10000 });
    const risky = paymentLikelihood({ reliability: 20, daysOverdue: 30, balanceDue: 10000, priorDisputed: 2 });
    expect(reliable).toBeGreaterThan(risky);
    expect(reliable).toBeLessThanOrEqual(1);
    expect(risky).toBeGreaterThanOrEqual(0);
  });

  it('churnRisk rises with disengagement and ignores', () => {
    const low = churnRisk({ reliability: 90, daysOverdue: 0, balanceDue: 0, ignoredRate: 0 });
    const high = churnRisk({ reliability: 10, daysOverdue: 0, balanceDue: 0, ignoredRate: 0.9, priorDisputed: 2 });
    expect(high).toBeGreaterThan(low);
  });

  it('collectionForecast weights balances by likelihood', () => {
    const f = collectionForecast([
      { balanceDue: 10000, likelihood: 0.9 },
      { balanceDue: 10000, likelihood: 0.1 },
    ]);
    expect(f.totalOutstanding).toBe(20000);
    expect(f.expectedRecovery).toBe(10000);
    expect(f.recoveryRate).toBe(0.5);
  });

  it('nextBestAction escalates long-overdue low-likelihood accounts', () => {
    const nba = nextBestAction({ reliability: 10, daysOverdue: 40, balanceDue: 200000, priorDisputed: 1 });
    expect(nba.action).toBe('escalate-to-manager');
  });

  it('nextBestAction offers a plan for high-value moderate-likelihood accounts', () => {
    // reliability 55, 8d overdue → likelihood ≈ 0.43 (in the 0.35–0.6 band).
    const nba = nextBestAction({ reliability: 55, daysOverdue: 8, balanceDue: 80000 });
    expect(nba.action).toBe('offer-payment-plan');
  });

  it('nextBestAction sends a friendly reminder before due', () => {
    expect(nextBestAction({ reliability: 50, daysOverdue: -2, balanceDue: 1000 }).action).toBe('send-friendly-reminder');
  });
});
