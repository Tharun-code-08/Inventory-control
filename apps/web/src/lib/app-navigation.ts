import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Factory,
  FileCheck,
  FileSignature,
  FileText,
  LayoutDashboard,
  Package,
  HelpCircle,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';

export type NavCommand = {
  id: string;
  label: string;
  hint: string;
  path: string;
  section: string;
  icon: LucideIcon;
  keywords: string[];
};

type UserLike = {
  role?: string;
  permissions?: string[];
};

function hasPerm(user: UserLike | null | undefined, perm: string) {
  const role = String(user?.role ?? '').toUpperCase();
  const isOrgAdmin = role === 'ADMIN' || role === 'OWNER';
  return isOrgAdmin || (user?.permissions ?? []).includes(perm);
}

export function buildNavCommands(user: UserLike | null | undefined): NavCommand[] {
  const items: NavCommand[] = [];

  const push = (
    id: string,
    label: string,
    hint: string,
    path: string,
    section: string,
    icon: LucideIcon,
    extraKeywords: string[] = [],
  ) => {
    items.push({
      id,
      label,
      hint,
      path,
      section,
      icon,
      keywords: [label, hint, path, section, ...extraKeywords].map((k) => k.toLowerCase()),
    });
  };

  if (String(user?.role ?? '').toUpperCase() === 'ADMIN' || String(user?.role ?? '').toUpperCase() === 'OWNER') {
    push('dashboard', 'Dashboard', 'KPIs and activity', '/dashboard', 'Overview', LayoutDashboard, [
      'home',
      'kpi',
    ]);
  }

  if (hasPerm(user, 'company:read')) {
    push('companies', 'Companies', 'Legal entities', '/companies', 'Master Data', Building2);
  }
  if (hasPerm(user, 'shop:read')) {
    push('plants', 'Plants', 'Shops and warehouses', '/plants', 'Master Data', Factory, ['shop']);
    push('customers', 'Customers', 'Customer master', '/customers', 'Master Data', Users);
  }
  if (hasPerm(user, 'storage_location:read')) {
    push('storage', 'Storage Locations', 'Bins and zones', '/storage-locations', 'Master Data', Warehouse);
    push('storage-new', 'New storage location', 'Add bin', '/storage-locations/new', 'Actions', Warehouse, ['new']);
  }
  if (hasPerm(user, 'product:read')) {
    push('products', 'Products', 'SKU catalog', '/products', 'Master Data', Package, ['sku', 'inventory']);
    push('products-new', 'Create product', 'Add SKU', '/products/new', 'Actions', Package, ['new', 'add']);
  }
  if (hasPerm(user, 'supplier:read')) {
    push('suppliers', 'Suppliers', 'Vendor master', '/suppliers', 'Master Data', Truck, ['vendor']);
    push('suppliers-new', 'Add supplier', 'Onboard vendor', '/suppliers/new', 'Actions', Truck, ['new']);
  }
  if (hasPerm(user, 'shop:read')) {
    push('customers-new', 'Add customer', 'New customer', '/customers/new', 'Actions', Users, ['new']);
  }

  if (hasPerm(user, 'rfq:read')) {
    push('rfqs', 'RFQs', 'Request for quotation', '/rfqs', 'Procurement', FileText);
    push('rfqs-new', 'New RFQ', 'Create RFQ', '/rfqs/new', 'Actions', FileText, ['new']);
  }
  if (hasPerm(user, 'shop:read')) {
    push(
      'quotations',
      'Sales Quotations',
      'Customer quotes',
      '/quotations',
      'Sales & Finance',
      FileCheck,
    );
    push('quotations-new', 'New quotation', 'Create quote', '/quotations/new', 'Actions', FileCheck, ['new']);
  }
  if (hasPerm(user, 'contract:read')) {
    push('contracts', 'Contracts', 'Supplier agreements', '/contracts', 'Procurement', FileSignature);
    push('contracts-new', 'New contract', 'Create contract', '/contracts/new', 'Actions', FileSignature, ['new']);
  }
  if (hasPerm(user, 'purchase_order:read')) {
    push('po', 'Purchase Orders', 'Procure stock', '/purchase-orders', 'Procurement', ClipboardList, ['po']);
    push('po-new', 'New purchase order', 'Raise PO', '/purchase-orders/new', 'Actions', ClipboardList);
  }
  push('gr', 'Goods Receipt', 'Receive stock', '/goods-receipts', 'Warehouse', ArrowDownToLine, ['inbound']);
  push('gr-new', 'New goods receipt', 'Post GR', '/goods-receipts/new', 'Actions', ArrowDownToLine);
  if (hasPerm(user, 'supplier:read')) {
    push('portal', 'Supplier Portal', 'Vendor visibility', '/supplier-portal', 'Procurement', Truck);
  }

  if (hasPerm(user, 'shop:read')) {
    push('sales', 'Sales', 'Sales orders', '/sales', 'Sales & Finance', ShoppingCart);
    push('sales-new', 'New sales order', 'Create SO', '/sales/new', 'Actions', ShoppingCart, ['new']);
    push('invoices', 'Invoices', 'Billing', '/invoices', 'Sales & Finance', FileText);
    push('invoices-new', 'New invoice', 'Create invoice', '/invoices/new', 'Actions', FileText, ['new']);
    push('payments', 'Payments', 'Settlements', '/payments', 'Sales & Finance', FileCheck);
  }
  if (hasPerm(user, 'goods_issue:read')) {
    push('gi', 'Goods Issue', 'Issue stock', '/goods-issues', 'Warehouse', ArrowUpFromLine, ['outbound']);
  }
  push('returns-new', 'New return', 'Create return draft', '/returns/new', 'Actions', ArrowUpFromLine, ['new']);

  if (hasPerm(user, 'report:view')) {
    push('warehouse', 'Warehouse', 'Stock overview', '/warehouse', 'Operations', Warehouse, ['stock']);
    push('reports', 'Reports', 'Registers and exports', '/reports', 'Operations', BarChart3);
    push('notifications', 'Notifications', 'Alerts inbox', '/notifications', 'Operations', Bell);
  }

  push('settings', 'Settings', 'Preferences', '/settings', 'System', Settings, ['profile']);
  if (hasPerm(user, 'user:manage') || user?.role === 'OWNER' || user?.role === 'ADMIN') {
    push(
      'transaction-number-series',
      'Transaction Number Series',
      'Customize document prefixes',
      '/settings?tab=customization&section=transaction-number-series',
      'System',
      Settings,
      ['series', 'prefix', 'number', 'customization'],
    );
    push(
      'email-notifications',
      'Email Notifications',
      'Customize email templates and alerts',
      '/settings?tab=customization&section=email-notifications',
      'System',
      Settings,
      ['email', 'smtp', 'notifications', 'customization'],
    );
  }
  push('help', 'Help & Support', 'Guides and workflows', '/help', 'System', HelpCircle, [
    'faq',
    'guide',
    'support',
    'workflow',
  ]);

  return items;
}

export function filterNavCommands(commands: NavCommand[], query: string): NavCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((cmd) => cmd.keywords.some((k) => k.includes(q)));
}
