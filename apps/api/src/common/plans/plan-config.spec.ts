import { SubscriptionPlan } from '@prisma/client';
import { planAllowsFeature } from './plan-config';

describe('planAllowsFeature', () => {
  it('allows all features on Plus', () => {
    expect(planAllowsFeature(SubscriptionPlan.PLUS, 'api')).toBe(true);
    expect(planAllowsFeature(SubscriptionPlan.PLUS, 'purchase_orders')).toBe(true);
    expect(planAllowsFeature(SubscriptionPlan.PLUS, 'supplier_portal')).toBe(true);
  });

  it('blocks API, vendor portal, and audit RBAC on Pro', () => {
    expect(planAllowsFeature(SubscriptionPlan.PRO, 'api')).toBe(false);
    expect(planAllowsFeature(SubscriptionPlan.PRO, 'vendor_portal')).toBe(false);
    expect(planAllowsFeature(SubscriptionPlan.PRO, 'audit_rbac')).toBe(false);
    expect(planAllowsFeature(SubscriptionPlan.PRO, 'sales_orders')).toBe(true);
    expect(planAllowsFeature(SubscriptionPlan.PRO, 'purchase_orders')).toBe(true);
  });

  it('blocks all gated features on Trial', () => {
    expect(planAllowsFeature(SubscriptionPlan.TRIAL, 'purchase_orders')).toBe(false);
    expect(planAllowsFeature(SubscriptionPlan.TRIAL, 'reports')).toBe(false);
    expect(planAllowsFeature(SubscriptionPlan.TRIAL, 'invoices')).toBe(false);
    expect(planAllowsFeature(SubscriptionPlan.TRIAL, 'backups')).toBe(false);
  });
});
