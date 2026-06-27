import { BRAND } from '@/lib/brand';

export type MarketingImageSlot = {
  id: string;
  label: string;
  alt: string;
  recommendedSize: string;
  /** Set when screenshot is uploaded to public/marketing/ */
  src?: string;
};

export type MarketingCta = {
  label: string;
  href: string;
};

export type MarketingNavLink = {
  label: string;
  href: string;
};

export type MarketingFeatureTab = {
  id: string;
  label: string;
  description?: string;
  imageSlot: MarketingImageSlot;
};

export type MarketingFeatureBlock = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  tabs: MarketingFeatureTab[];
  cta?: MarketingCta;
  reversed?: boolean;
};

export type MarketingDeviceTab = {
  id: string;
  label: string;
  imageSlot: MarketingImageSlot;
};

export type MarketingIntegration = {
  id: string;
  name: string;
  description: string;
};

export type MarketingCapabilityCard = {
  title: string;
  body: string;
};

export type MarketingFooterLink = {
  label: string;
  href: string;
};

export type MarketingFooterColumn = {
  heading: string;
  links: MarketingFooterLink[];
};

const MARKETING_BASE = '/marketing';

function slot(
  id: string,
  filename: string,
  label: string,
  alt: string,
  recommendedSize: string,
): MarketingImageSlot {
  return {
    id,
    label,
    alt,
    recommendedSize,
    src: `${MARKETING_BASE}/${filename}`,
  };
}

export const MARKETING_NAV: MarketingNavLink[] = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
];

export const MARKETING_BADGES = [
  'Multi-store retail',
  'Procurement-to-payment',
  'Role-based access',
  'GST-ready workflows',
  'Real-time stock ledger',
  'Supplier portal',
  'Purchase orders & RFQs',
  'Sales quotations & invoices',
  'Barcode label printing',
];

export const MARKETING_HERO = {
  eyebrow: BRAND.companyName.toUpperCase(),
  badge: 'Retail inventory & procurement ERP',
  title: 'Run your entire retail operation from one source of truth.',
  body: 'SoftdigitIMS connects procurement, inventory, sales, and finance into a single, GST-ready platform — from RFQ and purchase orders to barcoded goods receipts, invoices, and payments. Every plant, SKU, and document stays in sync.',
  primaryCta: { label: 'Start free trial', href: '/signup?plan=trial' } satisfies MarketingCta,
  secondaryCta: { label: 'View pricing', href: '#pricing' } satisfies MarketingCta,
  highlights: ['No credit card required', '7-day free trial', 'Cancel anytime'],
  poweredBy: BRAND.poweredBy,
  imageSlot: slot(
    'hero-dashboard',
    'hero-dashboard.png',
    'Dashboard screenshot',
    'SoftdigitIMS dashboard overview',
    '1400×900',
  ),
};

export type MarketingStat = {
  /** Numeric target to animate; omit for a text-only value like "Real-time". */
  value?: number;
  /** Static display string when there is no number to count up. */
  display?: string;
  prefix?: string;
  suffix?: string;
  label: string;
  description: string;
};

export const MARKETING_STATS: { eyebrow: string; items: MarketingStat[] } = {
  eyebrow: 'Built for how retail actually runs',
  items: [
    { value: 10, suffix: '+', label: 'Integrated modules', description: 'RFQ to payment, one platform' },
    { value: 100, suffix: '%', label: 'GST-ready', description: 'HSN lookup & compliant invoices' },
    { display: 'Real-time', label: 'Stock ledger', description: 'Accurate across every plant' },
    { display: '24/7', label: 'Cloud access', description: 'Any browser, any device' },
  ],
};

export type MarketingWorkflowStep = {
  /** Maps to an icon in MarketingWorkflow. */
  id: string;
  step: string;
  title: string;
  body: string;
};

export const MARKETING_WORKFLOW: {
  eyebrow: string;
  title: string;
  body: string;
  steps: MarketingWorkflowStep[];
} = {
  eyebrow: 'How it works',
  title: 'One connected flow from purchase to payment',
  body: 'Every document hands off to the next — no re-keying, no reconciliation gaps. Stock, suppliers, and finance always reflect the same truth.',
  steps: [
    {
      id: 'source',
      step: 'Step 1',
      title: 'Source & order',
      body: 'Raise RFQs, compare supplier quotes, and convert the winner into an approved purchase order.',
    },
    {
      id: 'receive',
      step: 'Step 2',
      title: 'Receive & stock',
      body: 'Book goods receipts against the PO. Stock and the plant-level ledger update in real time.',
    },
    {
      id: 'sell',
      step: 'Step 3',
      title: 'Quote & sell',
      body: 'Turn quotations into sales orders and GST invoices, with goods issued straight from live stock.',
    },
    {
      id: 'collect',
      step: 'Step 4',
      title: 'Bill & collect',
      body: 'Send invoices, track payments through Razorpay, and watch reports reconcile automatically.',
    },
  ],
};

export type MarketingFaqItem = {
  q: string;
  a: string;
};

export const MARKETING_FAQ: {
  eyebrow: string;
  title: string;
  body: string;
  items: MarketingFaqItem[];
} = {
  eyebrow: 'FAQ',
  title: 'Everything you need to know',
  body: 'Still have a question? Reach out and we will get back to you with a clear next step.',
  items: [
    {
      q: 'Is SoftdigitIMS GST-ready for Indian businesses?',
      a: 'Yes. Pricing is in INR, invoices follow GST formatting with HSN code lookup, and address workflows are built for India-ready compliance out of the box.',
    },
    {
      q: 'Can I manage multiple stores and plants?',
      a: 'Absolutely. Assign products, storage locations, and team permissions per plant, with a real-time stock ledger that stays accurate across every location.',
    },
    {
      q: 'Do I need a credit card to start?',
      a: 'No. The 7-day free trial requires no credit card. Explore the full procure-to-pay flow first, then upgrade to a paid plan only when you are ready.',
    },
    {
      q: 'How does billing and payment work?',
      a: 'Subscriptions are handled securely through Razorpay with monthly or yearly billing. Plans are flexible with no lock-in, so you can cancel anytime.',
    },
    {
      q: 'Will my team need training to get started?',
      a: 'The workflows mirror how retail operations already run — RFQ to PO to goods receipt to invoice. Most teams are productive on day one, and the supplier portal keeps vendors in the loop.',
    },
    {
      q: 'Is my data secure?',
      a: 'Access is governed by role-based permissions, every tenant is isolated, and documents like POs and invoices are generated as auditable PDFs you fully control.',
    },
  ],
};

export const MARKETING_DEVICES = {
  eyebrow: 'Seamless across devices',
  title: 'Use on any device — browser, tablet, or mobile',
  body: 'SoftdigitIMS runs in the browser your team already uses. Check stock, approve POs, and review reports from the shop floor or back office.',
  tabs: [
    {
      id: 'web',
      label: 'Web app',
      imageSlot: slot('devices-web', 'devices-web.png', 'Web app', 'SoftdigitIMS web application', '1200×800'),
    },
    {
      id: 'mobile',
      label: 'Mobile web',
      imageSlot: slot('devices-mobile', 'devices-mobile.png', 'Mobile web', 'SoftdigitIMS on mobile browser', '390×844'),
    },
  ] satisfies MarketingDeviceTab[],
};

export const MARKETING_FEATURE_BLOCKS: MarketingFeatureBlock[] = [
  {
    id: 'warehouse',
    eyebrow: 'Warehouse & inventory',
    title: 'Keep every plant and SKU moving forward',
    body: 'Plan, receive, issue, and reconcile stock across plants and storage locations — with thresholds, ledgers, and reports your ops team can trust.',
    cta: { label: 'Start free trial', href: '/signup?plan=trial' },
    tabs: [
      {
        id: 'products',
        label: 'Products',
        imageSlot: slot('warehouse-products', 'warehouse-products.png', 'Products', 'Product catalog in SoftdigitIMS', '1200×800'),
      },
      {
        id: 'gr',
        label: 'Goods receipt',
        imageSlot: slot('warehouse-goods-receipt', 'warehouse-goods-receipt.png', 'Goods receipt', 'Goods receipt screen', '1200×800'),
      },
      {
        id: 'gi',
        label: 'Goods issue',
        imageSlot: slot('warehouse-goods-issue', 'warehouse-goods-issue.png', 'Goods issue', 'Goods issue screen', '1200×800'),
      },
      {
        id: 'reports',
        label: 'Reports',
        imageSlot: slot('warehouse-reports', 'warehouse-reports.png', 'Reports', 'Inventory reports', '1200×800'),
      },
    ],
  },
  {
    id: 'procurement',
    eyebrow: 'Procurement',
    title: 'Source, order, and receive without the chaos',
    body: 'From RFQ to purchase order to goods receipt — govern procurement with supplier master data, approvals, and supplier portal visibility.',
    cta: { label: 'Start free trial', href: '/signup?plan=trial' },
    reversed: true,
    tabs: [
      {
        id: 'rfq',
        label: 'RFQs',
        imageSlot: slot('procurement-rfq', 'procurement-rfq.png', 'RFQs', 'Request for quotation', '1200×800'),
      },
      {
        id: 'po',
        label: 'Purchase orders',
        imageSlot: slot('procurement-po', 'procurement-po.png', 'Purchase orders', 'Purchase order form (placeholder)', '1200×800'),
      },
      {
        id: 'gr',
        label: 'Goods receipts',
        imageSlot: slot('procurement-gr', 'procurement-gr.png', 'Goods receipts', 'Procurement goods receipt', '1200×800'),
      },
      {
        id: 'portal',
        label: 'Supplier portal',
        imageSlot: slot('procurement-supplier-portal', 'procurement-portal.png', 'Supplier portal', 'Supplier portal view (placeholder)', '1200×800'),
      },
    ],
  },
  {
    id: 'sales',
    eyebrow: 'Sales & finance',
    title: 'Quote, bill, and track payments in one flow',
    body: 'Sales quotations, invoices, and payment tracking tied to your inventory — so finance and operations share one version of the truth.',
    cta: { label: 'View pricing', href: '#pricing' },
    tabs: [
      {
        id: 'quotations',
        label: 'Quotations',
        imageSlot: slot('sales-quotations', 'sales-quotations.png', 'Quotations', 'Sales quotation', '1200×800'),
      },
      {
        id: 'invoices',
        label: 'Invoices',
        imageSlot: slot('sales-invoices', 'sales-invoices.png', 'Invoices', 'Invoice list (placeholder)', '1200×800'),
      },
      {
        id: 'payments',
        label: 'Payments',
        imageSlot: slot('sales-payments', 'sales-payments.png', 'Payments', 'Payment tracking (placeholder)', '1200×800'),
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        imageSlot: slot('sales-dashboard', 'sales-dashboard.png', 'Dashboard', 'Operations dashboard', '1200×800'),
      },
    ],
  },
];

export const MARKETING_CAPABILITIES = {
  eyebrow: 'Platform',
  title: 'Built for retail teams, powered by simplicity',
  largeCard: {
    title: 'Personalize every plant and workflow',
    body: 'Multi-plant assignments, storage locations, role-based permissions, and customizable document numbering — so SoftdigitIMS fits how your business actually runs.',
  } satisfies MarketingCapabilityCard,
  smallCards: [
    {
      title: 'Collaborate in context',
      body: 'RFQs, POs, and goods movements stay linked — comments and status live where your team works.',
    },
    {
      title: 'Speaks your language',
      body: 'INR pricing, GST HSN lookup, and India-ready address workflows built into daily operations.',
    },
    {
      title: 'View things your way',
      body: 'Registers, exports, and dashboards for stock, procurement, and sales — filter by plant or date range.',
    },
  ] satisfies MarketingCapabilityCard[],
  integrations: [
    { id: 'razorpay', name: 'Razorpay', description: 'Subscription billing & checkout' },
    { id: 'gst', name: 'GST HSN', description: 'Portal lookup for product codes' },
    { id: 'smtp', name: 'Email (SMTP)', description: 'Tenant sender & notifications' },
    { id: 'pdf', name: 'PDF exports', description: 'PO, invoice & document PDFs' },
  ] satisfies MarketingIntegration[],
};

export const MARKETING_CONTACT = {
  title: 'Contact',
  body: 'Tell us about your stores, pain points, and timeline. We will respond with a clear next step—usually a short discovery call.',
  companyName: BRAND.companyName,
  siteUrl: BRAND.siteOrigin,
  siteLabel: BRAND.siteOrigin.replace(/^https:\/\//, ''),
};

export const MARKETING_FINAL_CTA = {
  title: 'Ready to get started?',
  body: 'Start your free trial of SoftdigitIMS. No credit card required.',
  primaryCta: { label: 'Start free trial', href: '/signup?plan=trial' } satisfies MarketingCta,
  secondaryCta: { label: 'Sign in', href: '/login' } satisfies MarketingCta,
  images: [
    slot('final-cta-dashboard', 'final-cta-dashboard.png', 'Dashboard', 'SoftdigitIMS dashboard', '800×600'),
    slot('final-cta-mobile', 'final-cta-mobile.png', 'Mobile', 'SoftdigitIMS mobile view', '320×640'),
  ],
};

export const MARKETING_FOOTER = {
  tagline: 'Retail inventory and procurement software for multi-store businesses.',
  navColumns: [
    {
      heading: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: BRAND.productName, href: '#ims' },
        { label: 'Pricing', href: '#pricing' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'Contact', href: '#contact' },
        { label: 'Sign in', href: '/login' },
      ],
    },
  ] satisfies MarketingFooterColumn[],
  privacyUrl: null as string | null,
  termsUrl: null as string | null,
  socialLinks: {
    linkedin: null as string | null,
    twitter: null as string | null,
  },
};

/** Section anchor ids used across the landing page */
export const MARKETING_SECTION_IDS = {
  features: 'features',
  ims: 'ims',
  pricing: 'pricing',
  contact: 'contact',
} as const;
