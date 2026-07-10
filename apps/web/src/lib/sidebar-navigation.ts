import type { LucideIcon } from 'lucide-react';
import { menuIcons } from '@/config/iconMap';

// Typed section IDs — no bare string literals across the codebase
export const SidebarSectionId = {
  Overview: 'overview',
  MasterData: 'master-data',
  Procurement: 'procurement',
  SalesFinance: 'sales-finance',
  Operations: 'operations',
} as const;
export type SidebarSectionId = (typeof SidebarSectionId)[keyof typeof SidebarSectionId];

// Structured badge metadata — extensible (number | warning | dot later)
export type SidebarBadge = { type: 'approvals' };

type GateFlags = {
  permission?: string;
  requireOrgAdmin?: boolean;
  requirePlatformAdmin?: boolean;
};

// Node model is nesting-ready; only 'link' nodes populated this round
export type SidebarLink = GateFlags & {
  kind: 'link';
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: SidebarBadge;
};
export type SidebarGroup = GateFlags & {
  kind: 'group';
  label: string;
  icon: LucideIcon;
  children: SidebarNode[];
};
export type SidebarNode = SidebarLink | SidebarGroup;

export type SidebarSection = {
  id: SidebarSectionId;
  title: string;
  children: SidebarNode[];
};

// Walk nodes recursively, returning only links (for flat mode, indicator, preload)
export function flattenLinks(nodes: SidebarNode[]): SidebarLink[] {
  const out: SidebarLink[] = [];
  for (const node of nodes) {
    if (node.kind === 'link') out.push(node);
    else out.push(...flattenLinks(node.children));
  }
  return out;
}

const L = (
  label: string,
  path: string,
  icon: LucideIcon,
  extra?: Partial<Omit<SidebarLink, 'kind' | 'label' | 'path' | 'icon'>>,
): SidebarLink => ({ kind: 'link', label, path, icon, ...extra });

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: SidebarSectionId.Overview,
    title: 'Overview',
    children: [
      L('Dashboard', '/dashboard', menuIcons.dashboard, { requireOrgAdmin: true }),
    ],
  },
  {
    id: SidebarSectionId.MasterData,
    title: 'Master Data',
    children: [
      L('Companies', '/companies', menuIcons.companies, { permission: 'company:read' }),
      L('Plants', '/plants', menuIcons.plants, { permission: 'shop:read' }),
      L('Storage Locations', '/storage-locations', menuIcons.storageLocations, { permission: 'storage_location:read' }),
      L('Products', '/products', menuIcons.products, { permission: 'product:read' }),
      L('Suppliers', '/suppliers', menuIcons.suppliers, { permission: 'supplier:read' }),
      L('Customers', '/customers', menuIcons.customers, { permission: 'shop:read' }),
    ],
  },
  {
    id: SidebarSectionId.Procurement,
    title: 'Procurement',
    children: [
      L('RFQs', '/rfqs', menuIcons.rfqs, { permission: 'rfq:read' }),
      L('Contracts', '/contracts', menuIcons.contracts, { permission: 'contract:read' }),
      L('Purchase Orders', '/purchase-orders', menuIcons.purchaseOrders, { permission: 'purchase_order:read' }),
      L('Goods Receipt', '/goods-receipts', menuIcons.goodsReceipt),
      L('Goods Returns', '/returns', menuIcons.goodsReturns, { permission: 'shop:read' }),
      L('Supplier Portal', '/supplier-portal', menuIcons.supplierPortal, { permission: 'supplier:read' }),
      L('Supplier Bills', '/supplier-bills', menuIcons.supplierBills, { permission: 'shop:read' }),
      L('Supplier Payments', '/supplier-payments', menuIcons.supplierPayments, { permission: 'shop:read' }),
    ],
  },
  {
    id: SidebarSectionId.SalesFinance,
    title: 'Sales & Finance',
    children: [
      L('Sales Quotations', '/quotations', menuIcons.salesQuotations, { permission: 'shop:read' }),
      L('Sales', '/sales', menuIcons.sales, { permission: 'shop:read' }),
      L('Goods Issue', '/goods-issues', menuIcons.goodsIssue, { permission: 'goods_issue:read' }),
      L('Invoices', '/invoices', menuIcons.invoices, { permission: 'shop:read' }),
      L('E-Way Bills', '/eway-bills', menuIcons.ewayBills, { permission: 'shop:read' }),
      L('Payments', '/payments', menuIcons.payments, { permission: 'shop:read' }),
    ],
  },
  {
    id: SidebarSectionId.Operations,
    title: 'Operations',
    children: [
      L('Stock Transfers', '/stock-transfers', menuIcons.stockTransfers, { permission: 'stock_transfer:read' }),
      L('Warehouse', '/warehouse', menuIcons.warehouseOps, { permission: 'report:view' }),
      L('Reports', '/reports', menuIcons.reports, { permission: 'report:view' }),
      L('Notifications', '/notifications', menuIcons.notifications, { permission: 'report:view' }),
      L('Approvals', '/approvals', menuIcons.approvals, { permission: 'shop:read', badge: { type: 'approvals' } }),
      L('Upgrade', '/upgrade', menuIcons.upgrade, { permission: 'billing:manage' }),
      L('Platform Admin', '/platform/subscriptions', menuIcons.platformAdmin, { requirePlatformAdmin: true }),
      L('Print Labels', '/barcode-print', menuIcons.printLabels),
      L('Settings', '/settings', menuIcons.settings),
    ],
  },
];
