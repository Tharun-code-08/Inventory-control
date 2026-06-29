export type PlanId = 'trial' | 'pro' | 'plus';
export type BillingInterval = 'monthly' | 'yearly';

export const TRIAL_DAYS = 7;

export const PLAN_CATALOG = {
  trial: {
    id: 'trial' as const,
    name: 'Trial',
    badge: '7 days free',
    accent: 'blue',
    monthlyDisplay: 0,
    originalMonthly: null as number | null,
    features: [
      { label: '2 users max', included: true },
      { label: '1 warehouse', included: true },
      { label: '100 SKU limit', included: true },
      { label: 'Basic stock tracking', included: true },
      { label: 'Reports & analytics', included: false },
      { label: 'Purchase orders', included: false },
      { label: 'Integrations', included: false },
      { label: 'API access', included: false },
    ],
    cta: 'Try now for Free',
  },
  pro: {
    id: 'pro' as const,
    name: 'Pro',
    badge: 'Most popular',
    accent: 'emerald',
    monthlyDisplay: 399,
    originalMonthly: 499,
    features: [
      { label: 'Up to 10 users', included: true },
      { label: '3 warehouses', included: true },
      { label: 'Unlimited SKUs', included: true },
      { label: 'Full stock management', included: true },
      { label: 'Reports & analytics', included: true },
      { label: 'Purchase orders', included: true },
      { label: '2 integrations', included: true },
      { label: 'API access', included: false },
    ],
    cta: 'Get Pro',
  },
  plus: {
    id: 'plus' as const,
    name: 'Plus',
    badge: 'Full power',
    accent: 'violet',
    monthlyDisplay: 599,
    originalMonthly: 699,
    features: [
      { label: 'Unlimited users', included: true },
      { label: 'Unlimited warehouses', included: true },
      { label: 'Everything in Pro', included: true },
      { label: 'Advanced analytics', included: true },
      { label: 'Vendor portal', included: true },
      { label: 'Full API access', included: true },
      { label: 'Audit logs + RBAC', included: true },
      { label: 'Priority support', included: true },
    ],
    cta: 'Get Plus',
  },
} as const;

export const UPGRADE_HIGHLIGHTS = [
  {
    title: 'Pro: Full reporting',
    body: 'Trial has zero analytics. Pro unlocks stock reports, turnover trends, and low-stock alerts critical for real operations.',
    accent: 'emerald',
  },
  {
    title: 'Plus: No limits at all',
    body: 'Pro caps at 10 users and 3 warehouses. Plus removes every limit — built for enterprises managing multiple sites.',
    accent: 'violet',
  },
  {
    title: 'Plus: API & integrations',
    body: 'Pro supports 2 integrations. Plus provides full REST API access and unlimited integrations with ERP, accounting, and e-commerce platforms.',
    accent: 'blue',
  },
  {
    title: 'Plus: Compliance-ready',
    body: 'Audit logs, RBAC, and vendor portal are exclusive to Plus — required for ISO, GST audit, and multi-stakeholder workflows.',
    accent: 'amber',
  },
] as const;

export function planPrice(plan: Exclude<PlanId, 'trial'>, interval: BillingInterval) {
  if (interval === 'monthly') {
    return PLAN_CATALOG[plan].monthlyDisplay;
  }
  return plan === 'pro' ? 349 : 549;
}

export function yearlySavingsLabel() {
  return 'Save 12.5%';
}

export type SubscriptionSnapshot = {
  plan: 'TRIAL' | 'PRO' | 'PLUS';
  billingCycle: 'MONTHLY' | 'YEARLY' | null;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  daysLeftInTrial: number | null;
  isTrialExpired: boolean;
  lifecycleStage: string | null;
  trialProgressPct: number | null;
  limits: { maxUsers: number | null; maxWarehouses: number | null; maxSkus: number | null };
  features: {
    reports: boolean;
    purchaseOrders: boolean;
    rfqs?: boolean;
    contracts?: boolean;
    salesOrders?: boolean;
    salesQuotations?: boolean;
    invoices?: boolean;
    payments?: boolean;
    supplierPortal?: boolean;
    integrations: boolean;
    api: boolean;
    vendorPortal: boolean;
    auditRbac: boolean;
    backups?: boolean;
  };
};

export function backupsAllowed(sub: SubscriptionSnapshot | null | undefined): boolean {
  if (!sub) return false;
  if (sub.plan === 'TRIAL') return false;
  return Boolean(sub.features?.backups ?? (sub.plan === 'PRO' || sub.plan === 'PLUS'));
}

export function planDisplayName(plan: SubscriptionSnapshot['plan']) {
  if (plan === 'PRO') return 'Pro';
  if (plan === 'PLUS') return 'Plus';
  return 'Trial';
}

export function subscriptionPlanTier(plan: SubscriptionSnapshot['plan'] | PlanId): number {
  const normalized = typeof plan === 'string' ? plan.toUpperCase() : plan;
  if (normalized === 'PLUS' || normalized === 'plus') return 2;
  if (normalized === 'PRO' || normalized === 'pro') return 1;
  return 0;
}
