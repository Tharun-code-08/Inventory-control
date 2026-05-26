import { describe, expect, it } from 'vitest';
import { backupsAllowed, type SubscriptionSnapshot } from './plans';

const baseSnapshot = (): SubscriptionSnapshot => ({
  plan: 'PRO',
  billingCycle: 'MONTHLY',
  status: 'ACTIVE',
  trialStartsAt: null,
  trialEndsAt: null,
  subscriptionEndsAt: null,
  daysLeftInTrial: null,
  isTrialExpired: false,
  limits: { maxUsers: 10, maxWarehouses: 3, maxSkus: null },
  features: {
    reports: true,
    purchaseOrders: true,
    integrations: true,
    api: false,
    vendorPortal: false,
    auditRbac: false,
    backups: true,
  },
});

describe('backupsAllowed', () => {
  it('allows Pro and Plus when feature flag is enabled', () => {
    expect(backupsAllowed(baseSnapshot())).toBe(true);
    expect(
      backupsAllowed({
        ...baseSnapshot(),
        plan: 'PLUS',
        features: { ...baseSnapshot().features, backups: true, api: true },
      }),
    ).toBe(true);
  });

  it('blocks Trial plans', () => {
    expect(
      backupsAllowed({
        ...baseSnapshot(),
        plan: 'TRIAL',
        features: { ...baseSnapshot().features, backups: false },
      }),
    ).toBe(false);
  });

  it('returns false when subscription is missing', () => {
    expect(backupsAllowed(null)).toBe(false);
    expect(backupsAllowed(undefined)).toBe(false);
  });
});
