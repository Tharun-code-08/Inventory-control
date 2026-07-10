/**
 * Centralized Icon Map — every sidebar entry has a unique, semantically
 * appropriate icon. No two modules share the same component.
 *
 * STRICT RULE: No duplicate icon components.
 * New modules must verify their icon is not already used below.
 */

import {
  // Overview
  LayoutDashboard,

  // Master Data
  Building2,       // Companies     — legal entity / HQ building
  Factory,         // Plants        — manufacturing / shop floor
  Boxes,           // Storage Locs  — bins, zones, shelf slots
  Package,         // Products      — SKU / inventory item
  Handshake,       // Suppliers     — vendor relationship / partnership
  Users,           // Customers     — people / client master

  // Procurement
  FileSearch,      // RFQs          — document with search / discovery
  FileSignature,   // Contracts     — signed agreement
  ClipboardCheck,  // Purchase Orders — approved procurement list
  ArrowDownToLine, // Goods Receipt — inbound stock arrow
  PackageOpen,     // Goods Returns — returned / opened package
  Store,           // Supplier Portal — vendor storefront / external portal
  Receipt,         // Supplier Bills — billing document
  HandCoins,       // Supplier Payments — hand-off of cash to vendor

  // Sales & Finance
  ScrollText,      // Sales Quotations — quote / estimate scroll
  ShoppingCart,    // Sales          — sales order / cart
  ArrowUpFromLine, // Goods Issue    — outbound stock arrow
  FileCheck,       // Invoices       — verified billing document
  Route,           // E-Way Bills    — goods transit routing
  Banknote,        // Payments       — cash / settlement

  // Operations
  ArrowLeftRight,  // Stock Transfers — lateral movement between locations
  Warehouse,       // Warehouse Ops  — warehouse overview / stock view
  BarChart3,       // Reports        — analytics / register charts
  Bell,            // Notifications  — alerts inbox
  BadgeCheck,      // Approvals      — stamped approval badge
  Sparkles,        // Upgrade        — premium / upgrade prompt

  // Admin
  Monitor,         // Platform Admin — SaaS platform monitoring dashboard
  Printer,         // Print Labels   — label / barcode printer
  Settings,        // Settings       — configuration / preferences
} from 'lucide-react';

/**
 * Menu icon registry
 *
 * Validation checklist:
 * - ✓ No duplicates (enforced at runtime in dev)
 * - ✓ Each icon is semantically meaningful for its module
 * - ✓ Icons are visually distinct at 20px
 * - ✓ Consistent Lucide React design language
 */
export const menuIcons = {
  // Overview
  dashboard: LayoutDashboard,

  // Master Data
  companies: Building2,
  plants: Factory,
  storageLocations: Boxes,
  products: Package,
  suppliers: Handshake,
  customers: Users,

  // Procurement
  rfqs: FileSearch,
  contracts: FileSignature,
  purchaseOrders: ClipboardCheck,
  goodsReceipt: ArrowDownToLine,
  goodsReturns: PackageOpen,
  supplierPortal: Store,
  supplierBills: Receipt,
  supplierPayments: HandCoins,

  // Sales & Finance
  salesQuotations: ScrollText,
  sales: ShoppingCart,
  goodsIssue: ArrowUpFromLine,
  invoices: FileCheck,
  ewayBills: Route,
  payments: Banknote,

  // Operations & Warehouse
  stockTransfers: ArrowLeftRight,
  warehouseOps: Warehouse,
  reports: BarChart3,
  notifications: Bell,
  approvals: BadgeCheck,
  upgrade: Sparkles,

  // Admin
  platformAdmin: Monitor,
  printLabels: Printer,
  settings: Settings,
} as const;

export type MenuIconKey = keyof typeof menuIcons;

export function getIcon(key: MenuIconKey) {
  return menuIcons[key];
}

// Runtime duplicate guard (dev only)
if (import.meta.env.DEV) {
  const icons = Object.values(menuIcons);
  const iconNames = icons.map((icon) => (icon as { displayName?: string; name: string }).displayName ?? icon.name);
  const duplicates = iconNames.filter((name, idx) => iconNames.indexOf(name) !== idx);
  if (duplicates.length > 0) {
    console.error(
      '❌ ICON MAP ERROR: Duplicate icons detected.',
      'Duplicates:',
      [...new Set(duplicates)],
    );
  }
}

export const iconColors = {
  dashboard: 'text-indigo-600',
  companies: 'text-violet-600',
  plants: 'text-orange-600',
  storageLocations: 'text-amber-600',
  products: 'text-cyan-600',
  suppliers: 'text-emerald-600',
  customers: 'text-pink-600',
  rfqs: 'text-blue-600',
  contracts: 'text-red-600',
  purchaseOrders: 'text-teal-600',
  goodsReceipt: 'text-green-600',
  goodsReturns: 'text-rose-600',
  supplierPortal: 'text-sky-600',
  supplierBills: 'text-lime-600',
  supplierPayments: 'text-yellow-600',
  salesQuotations: 'text-fuchsia-600',
  sales: 'text-green-600',
  goodsIssue: 'text-red-600',
  invoices: 'text-blue-600',
  ewayBills: 'text-purple-600',
  payments: 'text-amber-600',
  stockTransfers: 'text-slate-600',
  warehouseOps: 'text-cyan-600',
  reports: 'text-indigo-600',
  notifications: 'text-red-600',
  approvals: 'text-emerald-600',
  upgrade: 'text-yellow-600',
  platformAdmin: 'text-pink-600',
  printLabels: 'text-teal-600',
  settings: 'text-muted-foreground',
} as const;
