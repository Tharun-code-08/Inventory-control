import { BillingCycle, SubscriptionPlan } from '@prisma/client';

export type PlanId = 'trial' | 'pro' | 'plus';
export type BillingInterval = 'monthly' | 'yearly';

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const value = Number(raw.trim());
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.round(value);
}

/** Trial access duration in days (env: TRIAL_DAYS, default 7). */
export function getTrialDays(): number {
  return parsePositiveInt(process.env.TRIAL_DAYS, 7);
}

/** Nurture email horizon — may exceed trial access (env: TRIAL_NURTURE_DAYS, default 90). */
export function getTrialNurtureDays(): number {
  return parsePositiveInt(process.env.TRIAL_NURTURE_DAYS, 90);
}

/** @deprecated Use getTrialDays() for env-aware trial length. */
export const TRIAL_DAYS = getTrialDays();

export const PLAN_LIMITS = {
  TRIAL: { maxUsers: 2, maxWarehouses: 1, maxSkus: 100 },
  PRO: { maxUsers: 10, maxWarehouses: 3, maxSkus: null as number | null },
  PLUS: { maxUsers: null as number | null, maxWarehouses: null as number | null, maxSkus: null as number | null },
} as const;

export const PLAN_PRICING = {
  pro: {
    monthly: { display: 399, original: 499, paise: 39900 },
    yearly: { displayPerMonth: 349, paiseTotal: 349 * 12 * 100 },
  },
  plus: {
    monthly: { display: 599, original: 699, paise: 59900 },
    yearly: { displayPerMonth: 549, paiseTotal: 549 * 12 * 100 },
  },
} as const;

export function orderAmountPaise(plan: Exclude<PlanId, 'trial'>, interval: BillingInterval): number {
  const pricing = PLAN_PRICING[plan][interval];
  return 'paiseTotal' in pricing ? pricing.paiseTotal : pricing.paise;
}

export function toSubscriptionPlan(plan: PlanId): SubscriptionPlan {
  if (plan === 'pro') return SubscriptionPlan.PRO;
  if (plan === 'plus') return SubscriptionPlan.PLUS;
  return SubscriptionPlan.TRIAL;
}

export function toBillingCycle(interval: BillingInterval): BillingCycle {
  return interval === 'yearly' ? BillingCycle.YEARLY : BillingCycle.MONTHLY;
}

export function subscriptionEndDate(plan: SubscriptionPlan, cycle: BillingCycle, from = new Date()): Date {
  const end = new Date(from);
  if (cycle === BillingCycle.YEARLY) {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export function trialEndDate(from = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + getTrialDays());
  return end;
}

export function subscriptionPlanTier(plan: SubscriptionPlan): number {
  if (plan === SubscriptionPlan.PLUS) return 2;
  if (plan === SubscriptionPlan.PRO) return 1;
  return 0;
}

export function isDowngrade(current: SubscriptionPlan, target: SubscriptionPlan): boolean {
  return subscriptionPlanTier(target) < subscriptionPlanTier(current);
}

export type PlanFeature =
  | 'reports'
  | 'purchase_orders'
  | 'integrations'
  | 'api'
  | 'vendor_portal'
  | 'audit_rbac'
  | 'rfqs'
  | 'contracts'
  | 'sales_orders'
  | 'sales_quotations'
  | 'invoices'
  | 'payments'
  | 'supplier_portal'
  | 'backups';

export function planAllowsFeature(plan: SubscriptionPlan, feature: PlanFeature): boolean {
  if (plan === SubscriptionPlan.PLUS) return true;
  if (plan === SubscriptionPlan.PRO) {
    // Pro blocks: API, vendor portal, audit RBAC; allows the rest.
    return feature !== 'api' && feature !== 'vendor_portal' && feature !== 'audit_rbac';
  }
  // Trial: only allowed features are those enforced elsewhere (core stock flows), everything here is gated.
  return false;
}
