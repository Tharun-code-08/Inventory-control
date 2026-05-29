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
  { label: 'Features', href: '#features' },
  { label: BRAND.productName, href: '#ims' },
  { label: 'Pricing', href: '#pricing' },
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
];

export const MARKETING_HERO = {
  eyebrow: BRAND.companyName.toUpperCase(),
  title: 'Practical technology for retailers who need clarity, control, and calm operations.',
  body: 'We help teams design lean inventory workflows, implement dependable tooling, and ship outcomes—not slide decks. When you are ready to run the floor from one source of truth, we are here.',
  primaryCta: { label: 'Start free trial', href: '/signup?plan=trial' } satisfies MarketingCta,
  secondaryCta: { label: 'View pricing', href: '#pricing' } satisfies MarketingCta,
  poweredBy: BRAND.poweredBy,
  imageSlot: slot(
    'hero-dashboard',
    'hero-dashboard.png',
    'Dashboard screenshot',
    'Retail IMS dashboard overview',
    '1400×900',
  ),
};

export const MARKETING_DEVICES = {
  eyebrow: 'Seamless across devices',
  title: 'Use on any device — browser, tablet, or mobile',
  body: 'Retail IMS runs in the browser your team already uses. Check stock, approve POs, and review reports from the shop floor or back office.',
  tabs: [
    {
      id: 'web',
      label: 'Web app',
      imageSlot: slot('devices-web', 'devices-web.png', 'Web app', 'Retail IMS web application', '1200×800'),
    },
    {
      id: 'mobile',
      label: 'Mobile web',
      imageSlot: slot('devices-mobile', 'devices-mobile.png', 'Mobile web', 'Retail IMS on mobile browser', '390×844'),
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
        imageSlot: slot('warehouse-products', 'warehouse-products.png', 'Products', 'Product catalog in Retail IMS', '1200×800'),
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
    body: 'Multi-plant assignments, storage locations, role-based permissions, and customizable document numbering — so Retail IMS fits how your business actually runs.',
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
  body: 'Start your free trial of Retail IMS. No credit card required.',
  primaryCta: { label: 'Start free trial', href: '/signup?plan=trial' } satisfies MarketingCta,
  secondaryCta: { label: 'Sign in', href: '/login' } satisfies MarketingCta,
  images: [
    slot('final-cta-dashboard', 'final-cta-dashboard.png', 'Dashboard', 'Retail IMS dashboard', '800×600'),
    slot('final-cta-mobile', 'final-cta-mobile.png', 'Mobile', 'Retail IMS mobile view', '320×640'),
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
