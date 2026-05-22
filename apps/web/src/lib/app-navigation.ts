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
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN';
  return isAdmin || (user?.permissions ?? []).includes(perm);
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

  if (String(user?.role ?? '').toUpperCase() === 'ADMIN') {
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
  }
  if (hasPerm(user, 'product:read')) {
    push('products', 'Products', 'SKU catalog', '/products', 'Master Data', Package, ['sku', 'inventory']);
    push('products-new', 'Create product', 'Add SKU', '/products', 'Actions', Package, ['new', 'add']);
  }
  if (hasPerm(user, 'supplier:read')) {
    push('suppliers', 'Suppliers', 'Vendor master', '/suppliers', 'Master Data', Truck, ['vendor']);
    push('suppliers-new', 'Add supplier', 'Onboard vendor', '/suppliers', 'Actions', Truck, ['new']);
  }

  if (hasPerm(user, 'rfq:read')) {
    push('rfqs', 'RFQs', 'Request for quotation', '/rfqs', 'Procurement', FileText);
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
  }
  if (hasPerm(user, 'contract:read')) {
    push('contracts', 'Contracts', 'Supplier agreements', '/contracts', 'Procurement', FileSignature);
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
    push('invoices', 'Invoices', 'Billing', '/invoices', 'Sales & Finance', FileText);
    push('payments', 'Payments', 'Settlements', '/payments', 'Sales & Finance', FileCheck);
  }
  if (hasPerm(user, 'goods_issue:read')) {
    push('gi', 'Goods Issue', 'Issue stock', '/goods-issues', 'Warehouse', ArrowUpFromLine, ['outbound']);
  }

  if (hasPerm(user, 'report:view')) {
    push('warehouse', 'Warehouse', 'Stock overview', '/warehouse', 'Operations', Warehouse, ['stock']);
    push('reports', 'Reports', 'Registers and exports', '/reports', 'Operations', BarChart3);
    push('notifications', 'Notifications', 'Alerts inbox', '/notifications', 'Operations', Bell);
  }

  push('settings', 'Settings', 'Preferences', '/settings', 'System', Settings, ['profile']);

  return items;
}

export function filterNavCommands(commands: NavCommand[], query: string): NavCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((cmd) => cmd.keywords.some((k) => k.includes(q)));
}
