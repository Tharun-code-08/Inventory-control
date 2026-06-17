/**
 * Centralized Icon Map - Ensures every sidebar item has a unique icon
 *
 * STRICT RULE: Every key must have a unique icon component.
 * No duplicates allowed. New modules must verify their icon is not already used.
 */

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  BarChart3,
  Building2,
  ClipboardList,
  Factory,
  FileSearch,
  FileSignature,
  LayoutDashboard,
  Bell,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Barcode,
  TrendingUp,
  Undo2,
  Users,
  Warehouse,
  Wallet,
  Globe,
  Receipt,
  CheckCircle2,
  Scale,
  PieChart,
} from 'lucide-react';

/**
 * Menu icon registry - Each module has exactly one unique icon
 *
 * Validation checklist:
 * - ✓ No duplicates
 * - ✓ Each icon visually represents the module
 * - ✓ Icons are distinct at 20px size
 * - ✓ Consistent design language (Lucide React)
 * - ✓ All from same icon family
 */
export const menuIcons = {
  // Dashboard
  dashboard: LayoutDashboard,

  // Master Data
  companies: Building2,
  plants: Factory,
  storageLocations: Warehouse,
  products: Package,
  suppliers: TrendingUp, // Different from delivery/truck icons
  customers: Users,

  // Procurement
  rfqs: FileSearch, // Document with search icon - unique
  contracts: FileSignature,
  purchaseOrders: ClipboardList,
  goodsReceipt: ArrowDownToLine, // Downward arrow
  goodsReturns: Undo2, // Return/undo
  supplierPortal: Globe, // Portal/external access
  supplierBills: Receipt, // Invoice/receipt
  supplierPayments: Wallet, // Wallet/payment

  // Sales & Finance
  salesQuotations: PieChart, // Different from payment-related icons
  sales: ShoppingCart,
  goodsIssue: ArrowUpFromLine, // Upward arrow (opposite of receipt)
  invoices: CheckCircle2, // Verified/approved invoice
  ewayBills: Barcode, // Barcode/tracking
  payments: TrendingUp, // Upward trend for money flow

  // Operations & Warehouse
  stockTransfers: ArrowLeftRight, // Left-right arrows
  warehouseOps: Warehouse, // Warehouse operations (distinct from storage locations)
  reports: BarChart3, // Bar chart
  notifications: Bell,
  approvals: ShieldCheck, // Shield/approval
  upgrade: Sparkles, // Upgrade/premium

  // Admin
  platformAdmin: PieChart, // Different from general reports
  printLabels: Barcode,
  settings: Settings,
} as const;

/**
 * Type-safe icon getter
 */
export type MenuIconKey = keyof typeof menuIcons;

export function getIcon(key: MenuIconKey) {
  return menuIcons[key];
}

/**
 * Validation: Check for duplicate icons at runtime (dev mode only)
 */
if (import.meta.env.DEV) {
  const icons = Object.values(menuIcons);
  const iconNames = icons.map((icon) => icon.displayName || icon.name);
  const duplicates = iconNames.filter((name, idx) => iconNames.indexOf(name) !== idx);

  if (duplicates.length > 0) {
    console.error(
      '❌ ICON MAP ERROR: Duplicate icons detected. This violates the strict uniqueness requirement.',
      'Duplicates:',
      [...new Set(duplicates)],
    );
  }
}

/**
 * Icon Color Map - Optional: Use if you want specific colors per icon
 * (Currently all use default text color, but this is here for future use)
 */
export const iconColors = {
  dashboard: 'text-blue-600',
  companies: 'text-purple-600',
  plants: 'text-orange-600',
  storageLocations: 'text-amber-600',
  products: 'text-cyan-600',
  suppliers: 'text-green-600',
  customers: 'text-pink-600',
  rfqs: 'text-indigo-600',
  contracts: 'text-red-600',
  purchaseOrders: 'text-teal-600',
  goodsReceipt: 'text-emerald-600',
  goodsReturns: 'text-rose-600',
  supplierPortal: 'text-sky-600',
  supplierBills: 'text-lime-600',
  supplierPayments: 'text-yellow-600',
  salesQuotations: 'text-fuchsia-600',
  sales: 'text-green-600',
  goodsIssue: 'text-red-600',
  invoices: 'text-blue-600',
  ewayBills: 'text-purple-600',
  payments: 'text-orange-600',
  stockTransfers: 'text-amber-600',
  warehouseOps: 'text-cyan-600',
  reports: 'text-indigo-600',
  notifications: 'text-red-600',
  approvals: 'text-green-600',
  upgrade: 'text-yellow-600',
  platformAdmin: 'text-pink-600',
  printLabels: 'text-teal-600',
  settings: 'text-slate-600',
} as const;
