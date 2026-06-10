export const SUBSCRIPTION_LIFECYCLE_QUEUE = 'subscription-lifecycle';

export const PLATFORM_TEMPLATE_PREFIX = 'platform_';

export const TRIAL_FEATURE_CHECKLIST = [
  'login',
  'product_created',
  'gr_posted',
  'gi_posted',
  'report_viewed',
  'user_invited',
  'dashboard_viewed',
] as const;

export type TrialFeatureKey = (typeof TRIAL_FEATURE_CHECKLIST)[number];

export type LifecycleCampaignKind =
  | 'welcome'
  | 'paid_engagement'
  | 'renewal'
  | 'dunning'
  | 'trial_nurture'
  | 'trial_inactive'
  | 'trial_edu'
  | 'trial_expiry'
  | 'trial_expired';

export type LifecycleCampaignDefinition = {
  key: string;
  kind: LifecycleCampaignKind;
  /** Days since reference date (trial start, paid activation, etc.) */
  dayOffset?: number;
  /** Days before expiry (trial or subscription end) */
  daysBeforeExpiry?: number;
  /** Days after failed payment */
  daysAfterFailure?: number;
  /** Days after trial expiry */
  daysAfterTrialExpiry?: number;
  /** Only on 1st of month */
  monthlyOnFirst?: boolean;
  /** Requires paid plan */
  paidOnly?: boolean;
  /** Requires trial plan */
  trialOnly?: boolean;
  /** Marketing email — honor opt-out */
  marketing?: boolean;
  /** Transactional — always send */
  transactional?: boolean;
  title: string;
  subtitle?: string;
  paragraphs: string[];
  bullets?: string[];
  ctaPath?: string;
  ctaLabel?: string;
};

export const LIFECYCLE_CAMPAIGNS: LifecycleCampaignDefinition[] = [
  {
    key: 'platform_subscription_welcome',
    kind: 'welcome',
    paidOnly: true,
    transactional: true,
    title: 'Welcome',
    paragraphs: [],
  },
  {
    key: 'platform_trial_welcome',
    kind: 'welcome',
    trialOnly: true,
    marketing: true,
    title: 'Trial welcome',
    paragraphs: [],
  },
  // Paid engagement
  {
    key: 'paid_day_1',
    kind: 'paid_engagement',
    dayOffset: 1,
    paidOnly: true,
    marketing: true,
    title: 'Getting started with SoftdigitIMS',
    subtitle: 'Day 1 tips',
    paragraphs: [
      'Thanks for choosing SoftdigitIMS. Here are quick wins to set up your workspace today.',
    ],
    bullets: [
      'Add your first products and warehouses',
      'Invite team members from Settings',
      'Create a purchase order to track inbound stock',
    ],
    ctaPath: '/dashboard',
    ctaLabel: 'Open dashboard',
  },
  {
    key: 'paid_day_3',
    kind: 'paid_engagement',
    dayOffset: 3,
    paidOnly: true,
    marketing: true,
    title: 'Explore inventory workflows',
    paragraphs: ['By now you can streamline goods receipts and issues across plants.'],
    bullets: ['Post goods receipts against POs', 'Track stock balances in real time'],
    ctaPath: '/goods-receipts',
    ctaLabel: 'Manage receipts',
  },
  {
    key: 'paid_day_7',
    kind: 'paid_engagement',
    dayOffset: 7,
    paidOnly: true,
    marketing: true,
    title: 'Unlock procurement features',
    paragraphs: ['Use RFQs and supplier portal to simplify vendor collaboration.'],
    ctaPath: '/rfqs',
    ctaLabel: 'View RFQs',
  },
  {
    key: 'paid_day_14',
    kind: 'paid_engagement',
    dayOffset: 14,
    paidOnly: true,
    marketing: true,
    title: 'Sales and billing on SoftdigitIMS',
    paragraphs: ['Create sales orders, quotations, and customer invoices from one place.'],
    ctaPath: '/sales-orders',
    ctaLabel: 'Sales orders',
  },
  {
    key: 'paid_day_30',
    kind: 'paid_engagement',
    dayOffset: 30,
    paidOnly: true,
    marketing: true,
    title: 'One month with SoftdigitIMS',
    paragraphs: ['Review reports and backups to keep operations running smoothly.'],
    ctaPath: '/reports',
    ctaLabel: 'View reports',
  },
  {
    key: 'paid_monthly_update',
    kind: 'paid_engagement',
    monthlyOnFirst: true,
    paidOnly: true,
    marketing: true,
    title: 'Your monthly SoftdigitIMS update',
    paragraphs: ['Here is a quick summary of features you can use this month.'],
    ctaPath: '/dashboard',
    ctaLabel: 'Go to app',
  },
  // Renewal reminders
  ...([3, 1, 0] as const).flatMap((days) => [
    {
      key: `renewal_monthly_${days}`,
      kind: 'renewal' as const,
      daysBeforeExpiry: days,
      paidOnly: true,
      transactional: true,
      title: days === 0 ? 'Your subscription renews today' : `Renewal in ${days} day${days === 1 ? '' : 's'}`,
      paragraphs: ['Your SoftdigitIMS subscription is coming up for renewal.'],
      ctaPath: '/upgrade?renew=1',
      ctaLabel: 'Renew now',
    },
  ]),
  ...([7, 3, 1, 0] as const).flatMap((days) => [
    {
      key: `renewal_yearly_${days}`,
      kind: 'renewal' as const,
      daysBeforeExpiry: days,
      paidOnly: true,
      transactional: true,
      title: days === 0 ? 'Your yearly subscription renews today' : `Yearly renewal in ${days} days`,
      paragraphs: ['Your yearly SoftdigitIMS plan is due for renewal soon.'],
      ctaPath: '/upgrade?renew=1',
      ctaLabel: 'Renew subscription',
    },
  ]),
  // Dunning
  {
    key: 'dunning_immediate',
    kind: 'dunning',
    daysAfterFailure: 0,
    transactional: true,
    title: 'Payment failed',
    paragraphs: ['We could not process your subscription payment. Please update your payment method.'],
    ctaPath: '/upgrade?renew=1',
    ctaLabel: 'Retry payment',
  },
  {
    key: 'dunning_1d',
    kind: 'dunning',
    daysAfterFailure: 1,
    transactional: true,
    title: 'Reminder: payment failed',
    paragraphs: ['Your subscription payment is still pending. Retry to avoid interruption.'],
    ctaPath: '/upgrade?renew=1',
    ctaLabel: 'Retry payment',
  },
  {
    key: 'dunning_3d',
    kind: 'dunning',
    daysAfterFailure: 3,
    transactional: true,
    title: 'Action required: subscription payment',
    paragraphs: ['Please complete payment within the next few days to keep your account active.'],
    ctaPath: '/upgrade?renew=1',
    ctaLabel: 'Pay now',
  },
  {
    key: 'dunning_7d',
    kind: 'dunning',
    daysAfterFailure: 7,
    transactional: true,
    title: 'Subscription suspended',
    paragraphs: ['Your account has been suspended due to failed payment. Renew to restore access.'],
    ctaPath: '/upgrade?renew=1',
    ctaLabel: 'Restore access',
  },
  {
    key: 'dunning_14d',
    kind: 'dunning',
    daysAfterFailure: 14,
    transactional: true,
    title: 'Subscription expired',
    paragraphs: ['Your subscription has expired. Your data is retained — renew anytime to continue.'],
    ctaPath: '/upgrade?renew=1',
    ctaLabel: 'Renew subscription',
  },
  // Trial nurture
  ...([1, 3, 7, 14, 21, 30, 45, 60, 75, 90] as const).map((day) => ({
    key: `trial_day_${day}`,
    kind: 'trial_nurture' as const,
    dayOffset: day,
    trialOnly: true,
    marketing: true,
    title: `Day ${day}: make the most of your trial`,
    paragraphs: [`You are on day ${day} of your SoftdigitIMS trial. Keep building momentum.`],
    ctaPath: day <= 7 ? '/products' : day <= 30 ? '/purchase-orders' : '/reports',
    ctaLabel: 'Continue setup',
  })),
  {
    key: 'trial_inactive_7d',
    kind: 'trial_inactive',
    marketing: true,
    trialOnly: true,
    title: 'We miss you on SoftdigitIMS',
    paragraphs: ['You have not signed in recently. Here are features waiting for you.'],
    ctaPath: '/dashboard',
    ctaLabel: 'Sign in',
  },
  {
    key: 'trial_edu_inventory',
    kind: 'trial_edu',
    marketing: true,
    trialOnly: true,
    title: 'Set up your inventory',
    paragraphs: ['Create products and track stock across warehouses in minutes.'],
    ctaPath: '/products',
    ctaLabel: 'Add products',
  },
  {
    key: 'trial_edu_purchase',
    kind: 'trial_edu',
    marketing: true,
    trialOnly: true,
    title: 'Streamline purchasing',
    paragraphs: ['Create purchase orders and receive goods against them.'],
    ctaPath: '/purchase-orders',
    ctaLabel: 'Create PO',
  },
  {
    key: 'trial_edu_reports',
    kind: 'trial_edu',
    marketing: true,
    trialOnly: true,
    title: 'Insights from day one',
    paragraphs: ['Run stock and sales reports to understand your business.'],
    ctaPath: '/reports',
    ctaLabel: 'View reports',
  },
  ...([7, 3, 1] as const).map((days) => ({
    key: `trial_expiry_${days}`,
    kind: 'trial_expiry' as const,
    daysBeforeExpiry: days,
    trialOnly: true,
    transactional: true,
    title: days === 1 ? 'Trial ends tomorrow' : `Trial ends in ${days} days`,
    paragraphs: ['Upgrade to Pro or Plus to keep your data and continue using SoftdigitIMS.'],
    ctaPath: '/upgrade',
    ctaLabel: 'Upgrade now',
  })),
  {
    key: 'trial_expired_day_0',
    kind: 'trial_expired',
    daysAfterTrialExpiry: 0,
    trialOnly: true,
    transactional: true,
    title: 'Your trial has ended',
    paragraphs: ['Upgrade now to restore access. Your data is safe for a limited time.'],
    ctaPath: '/upgrade',
    ctaLabel: 'Upgrade now',
  },
  {
    key: 'trial_expired_3d',
    kind: 'trial_expired',
    daysAfterTrialExpiry: 3,
    marketing: true,
    title: 'Come back to SoftdigitIMS',
    paragraphs: ['Your trial ended a few days ago. Upgrade to pick up where you left off.'],
    ctaPath: '/upgrade',
    ctaLabel: 'View plans',
  },
  {
    key: 'trial_expired_7d',
    kind: 'trial_expired',
    daysAfterTrialExpiry: 7,
    marketing: true,
    title: 'Your data is waiting',
    paragraphs: ['Upgrade to Pro or Plus and restore full access to your workspace.'],
    ctaPath: '/upgrade',
    ctaLabel: 'Upgrade',
  },
  {
    key: 'trial_expired_14d',
    kind: 'trial_expired',
    daysAfterTrialExpiry: 14,
    marketing: true,
    title: 'Last chance to recover your workspace',
    paragraphs: ['Renew before data retention limits apply. We would love to have you back.'],
    ctaPath: '/upgrade',
    ctaLabel: 'Upgrade now',
  },
];

export const LIFECYCLE_CAMPAIGN_MAP = new Map(LIFECYCLE_CAMPAIGNS.map((c) => [c.key, c]));

export const RENEWAL_OFFSETS = {
  MONTHLY: [3, 1, 0],
  YEARLY: [7, 3, 1, 0],
} as const;

export const DUNNING_OFFSETS_DAYS = [0, 1, 3, 7, 14] as const;

export const DUNNING_CAMPAIGN_KEYS = [
  'dunning_immediate',
  'dunning_1d',
  'dunning_3d',
  'dunning_7d',
  'dunning_14d',
] as const;
