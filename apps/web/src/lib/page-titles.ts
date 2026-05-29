export const APP_BRAND = 'Softdigit Consulting';

export const DEFAULT_DOCUMENT_TITLE = `${APP_BRAND} | Retail operations & Retail IMS`;

type RouteTitleMeta = {
  page: string;
  module?: string;
};

const SETTINGS_TAB_LABELS: Record<string, string> = {
  profile: 'Profile',
  shop: 'Shop Details',
  cookies: 'Cookie Preferences',
  backups: 'Backups',
  users: 'Users',
  categories: 'Categories',
  roles: 'Roles & Permissions',
  customization: 'Customization',
};

const SETTINGS_SECTION_LABELS: Record<string, string> = {
  'transaction-number-series': 'Transaction Number Series',
  'email-notifications': 'Email Notifications',
};

const ROUTE_TITLES: Record<string, RouteTitleMeta> = {
  '/': { page: 'Home' },
  '/login': { page: 'Login' },
  '/signup': { page: 'Sign Up' },
  '/forgot-password': { page: 'Forgot Password' },
  '/reset-password': { page: 'Reset Password' },
  '/invite/accept': { page: 'Accept Invite' },
  '/supplier-portal/submit': { page: 'Supplier Portal Submit' },
  '/quotation-portal/review': { page: 'Quotation Review' },
  '/returns/acknowledge': { page: 'Return Acknowledgement' },
  '/supplier-delete/confirm': { page: 'Supplier Deletion Confirm' },
  '/dashboard': { page: 'Dashboard', module: 'Overview' },
  '/companies': { page: 'Companies', module: 'Master Data' },
  '/companies/new': { page: 'New Company', module: 'Master Data' },
  '/plants': { page: 'Plants', module: 'Master Data' },
  '/plants/new': { page: 'New Plant', module: 'Master Data' },
  '/storage-locations': { page: 'Storage Locations', module: 'Master Data' },
  '/storage-locations/new': { page: 'New Storage Location', module: 'Master Data' },
  '/suppliers': { page: 'Suppliers', module: 'Master Data' },
  '/suppliers/new': { page: 'New Supplier', module: 'Master Data' },
  '/products': { page: 'Products', module: 'Master Data' },
  '/products/new': { page: 'New Product', module: 'Master Data' },
  '/customers': { page: 'Customers', module: 'Master Data' },
  '/customers/new': { page: 'New Customer', module: 'Master Data' },
  '/rfqs': { page: 'RFQs', module: 'Procurement' },
  '/rfqs/new': { page: 'New RFQ', module: 'Procurement' },
  '/quotations': { page: 'Sales Quotations', module: 'Sales & Finance' },
  '/quotations/new': { page: 'New Quotation', module: 'Sales & Finance' },
  '/contracts': { page: 'Contracts', module: 'Procurement' },
  '/contracts/new': { page: 'New Contract', module: 'Procurement' },
  '/purchase-orders': { page: 'Purchase Orders', module: 'Procurement' },
  '/purchase-orders/new': { page: 'New Purchase Order', module: 'Procurement' },
  '/supplier-portal': { page: 'Supplier Portal', module: 'Procurement' },
  '/portal': { page: 'Supplier Portal', module: 'Procurement' },
  '/supplier-bills': { page: 'Supplier Bills', module: 'Procurement' },
  '/supplier-payments': { page: 'Supplier Payments', module: 'Procurement' },
  '/goods-receipts': { page: 'Goods Receipt', module: 'Warehouse' },
  '/goods-receipts/new': { page: 'New Goods Receipt', module: 'Warehouse' },
  '/goods-issues': { page: 'Goods Issues', module: 'Warehouse' },
  '/goods-issues/new': { page: 'Create Goods Issue', module: 'Warehouse' },
  '/stock-transfers': { page: 'Stock Transfers', module: 'Warehouse' },
  '/stock-transfers/new': { page: 'New Stock Transfer', module: 'Warehouse' },
  '/returns': { page: 'Goods Returns', module: 'Warehouse' },
  '/returns/new': { page: 'New Return', module: 'Warehouse' },
  '/sales': { page: 'Sales Orders', module: 'Sales & Finance' },
  '/sales/new': { page: 'New Sales Order', module: 'Sales & Finance' },
  '/invoices': { page: 'Invoices', module: 'Sales & Finance' },
  '/invoices/new': { page: 'New Invoice', module: 'Sales & Finance' },
  '/payments': { page: 'Payments', module: 'Sales & Finance' },
  '/payments/new': { page: 'New Payment', module: 'Sales & Finance' },
  '/warehouse': { page: 'Warehouse', module: 'Operations' },
  '/reports': { page: 'Reports', module: 'Operations' },
  '/notifications': { page: 'Notifications', module: 'Operations' },
  '/settings': { page: 'Settings', module: 'System' },
  '/upgrade': { page: 'Upgrade', module: 'System' },
  '/profile': { page: 'Profile', module: 'System' },
  '/help': { page: 'Help & Support', module: 'System' },
};

function resolveSettingsPage(searchParams: URLSearchParams): RouteTitleMeta {
  const tab = searchParams.get('tab') ?? 'profile';
  if (tab === 'customization') {
    const section = searchParams.get('section') ?? 'transaction-number-series';
    const page = SETTINGS_SECTION_LABELS[section] ?? SETTINGS_TAB_LABELS.customization;
    return { page, module: 'Settings' };
  }

  return {
    page: SETTINGS_TAB_LABELS[tab] ?? 'Settings',
    module: 'Settings',
  };
}

function resolveDynamicRoute(pathname: string): RouteTitleMeta | null {
  if (pathname.endsWith('/compare') && pathname.startsWith('/rfqs/')) {
    return { page: 'RFQ Compare', module: 'Procurement' };
  }
  if (/^\/rfqs\/[^/]+$/.test(pathname)) {
    return { page: 'RFQs', module: 'Procurement' };
  }
  if (/^\/sales\/[^/]+$/.test(pathname)) {
    return { page: 'Sales Order', module: 'Sales & Finance' };
  }
  return null;
}

function resolveRouteMeta(pathname: string, searchParams: URLSearchParams): RouteTitleMeta {
  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    return resolveSettingsPage(searchParams);
  }

  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname];
  }

  const dynamic = resolveDynamicRoute(pathname);
  if (dynamic) return dynamic;

  const sortedPaths = Object.keys(ROUTE_TITLES).sort((a, b) => b.length - a.length);
  for (const path of sortedPaths) {
    if (path === '/') continue;
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return ROUTE_TITLES[path];
    }
  }

  return { page: 'Dashboard', module: 'Overview' };
}

export function buildDocumentTitle(page: string, module?: string): string {
  const segments = [page.trim(), module?.trim(), APP_BRAND].filter(Boolean);
  return segments.join(' | ');
}

export function resolvePageTitle(pathname: string, searchParams = new URLSearchParams()): string {
  return resolveRouteMeta(pathname, searchParams).page;
}

export function resolveDocumentTitle(
  pathname: string,
  searchParams = new URLSearchParams(),
  pageOverride?: string,
): string {
  const meta = resolveRouteMeta(pathname, searchParams);
  const page = pageOverride?.trim() || meta.page;
  return buildDocumentTitle(page, meta.module);
}
