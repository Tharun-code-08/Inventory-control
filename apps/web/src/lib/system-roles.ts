import type { LucideIcon } from 'lucide-react';
import {
  Crown,
  Settings,
  UserCog,
  User,
  Eye,
  Truck,
} from 'lucide-react';

export type AccessLevel = 'full' | 'partial' | 'none';

export type RoleCapability = {
  label: string;
  level: AccessLevel;
};

export type SystemRoleDefinition = {
  name: SystemRoleName;
  title: string;
  description: string;
  accessTier: string;
  accessBadgeClass: string;
  icon: LucideIcon;
  iconClass: string;
  capabilities: RoleCapability[];
};

export type MatrixRow = {
  id: string;
  label: string;
  levels: Record<SystemRoleName, AccessLevel>;
};

export type SystemRoleName =
  | 'OWNER'
  | 'ADMIN'
  | 'INVENTORY_MANAGER'
  | 'WAREHOUSE_STAFF'
  | 'VIEWER'
  | 'VENDOR';

export const SYSTEM_ROLE_ORDER: SystemRoleName[] = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'WAREHOUSE_STAFF',
  'VIEWER',
  'VENDOR',
];

export const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    name: 'OWNER',
    title: 'Owner',
    description: 'Full platform control',
    accessTier: 'Super access',
    accessBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Crown,
    iconClass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    capabilities: [
      { label: 'Stock management', level: 'full' },
      { label: 'User & role mgmt', level: 'full' },
      { label: 'Billing & plan', level: 'full' },
      { label: 'Audit logs', level: 'full' },
    ],
  },
  {
    name: 'ADMIN',
    title: 'Admin',
    description: 'Org-level configuration',
    accessTier: 'High access',
    accessBadgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Settings,
    iconClass: 'text-blue-600 bg-blue-50 border-blue-200',
    capabilities: [
      { label: 'Stock management', level: 'full' },
      { label: 'User & role mgmt', level: 'full' },
      { label: 'Billing & plan', level: 'none' },
      { label: 'Audit logs', level: 'full' },
    ],
  },
  {
    name: 'INVENTORY_MANAGER',
    title: 'Inventory manager',
    description: 'Warehouse operations',
    accessTier: 'Ops access',
    accessBadgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    icon: UserCog,
    iconClass: 'text-violet-600 bg-violet-50 border-violet-200',
    capabilities: [
      { label: 'Stock management', level: 'full' },
      { label: 'User & role mgmt', level: 'none' },
      { label: 'Purchase orders', level: 'partial' },
      { label: 'Reports & analytics', level: 'full' },
    ],
  },
  {
    name: 'WAREHOUSE_STAFF',
    title: 'Warehouse staff',
    description: 'Day-to-day stock ops',
    accessTier: 'Limited ops',
    accessBadgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    icon: User,
    iconClass: 'text-amber-700 bg-amber-50 border-amber-200',
    capabilities: [
      { label: 'Receive stock', level: 'full' },
      { label: 'Dispatch orders', level: 'full' },
      { label: 'Edit product data', level: 'none' },
      { label: 'Reports & analytics', level: 'none' },
    ],
  },
  {
    name: 'VIEWER',
    title: 'Viewer / auditor',
    description: 'Read-only access',
    accessTier: 'Read only',
    accessBadgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Eye,
    iconClass: 'text-slate-600 bg-slate-50 border-slate-200',
    capabilities: [
      { label: 'View stock levels', level: 'full' },
      { label: 'View reports', level: 'full' },
      { label: 'Edit anything', level: 'none' },
      { label: 'Export data', level: 'partial' },
    ],
  },
  {
    name: 'VENDOR',
    title: 'Vendor / supplier',
    description: 'External portal access',
    accessTier: 'Portal only',
    accessBadgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Truck,
    iconClass: 'text-orange-600 bg-orange-50 border-orange-200',
    capabilities: [
      { label: 'Submit PO fulfillment', level: 'full' },
      { label: 'View own orders', level: 'full' },
      { label: 'Internal stock data', level: 'none' },
      { label: 'User management', level: 'none' },
    ],
  },
];

export const PERMISSION_MATRIX: MatrixRow[] = [
  {
    id: 'view_stock',
    label: 'View stock levels',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'full',
      WAREHOUSE_STAFF: 'full',
      VIEWER: 'full',
      VENDOR: 'none',
    },
  },
  {
    id: 'edit_products',
    label: 'Add / edit products',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'full',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'none',
      VENDOR: 'none',
    },
  },
  {
    id: 'receive_stock',
    label: 'Receive stock',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'full',
      WAREHOUSE_STAFF: 'full',
      VIEWER: 'none',
      VENDOR: 'none',
    },
  },
  {
    id: 'dispatch_orders',
    label: 'Dispatch orders',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'full',
      WAREHOUSE_STAFF: 'full',
      VIEWER: 'none',
      VENDOR: 'none',
    },
  },
  {
    id: 'create_po',
    label: 'Create purchase orders',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'partial',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'none',
      VENDOR: 'none',
    },
  },
  {
    id: 'approve_po',
    label: 'Approve purchase orders',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'none',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'none',
      VENDOR: 'none',
    },
  },
  {
    id: 'vendor_portal',
    label: 'Vendor portal access',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'partial',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'none',
      VENDOR: 'full',
    },
  },
  {
    id: 'reports',
    label: 'Reports & analytics',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'full',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'full',
      VENDOR: 'none',
    },
  },
  {
    id: 'export_data',
    label: 'Export data',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'full',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'partial',
      VENDOR: 'none',
    },
  },
  {
    id: 'manage_users',
    label: 'Manage users & roles',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'none',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'none',
      VENDOR: 'none',
    },
  },
  {
    id: 'api_integrations',
    label: 'API & integrations',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'none',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'none',
      VENDOR: 'none',
    },
  },
  {
    id: 'billing',
    label: 'Billing & subscription',
    levels: {
      OWNER: 'full',
      ADMIN: 'none',
      INVENTORY_MANAGER: 'none',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'none',
      VENDOR: 'none',
    },
  },
  {
    id: 'audit_logs',
    label: 'Audit logs',
    levels: {
      OWNER: 'full',
      ADMIN: 'full',
      INVENTORY_MANAGER: 'none',
      WAREHOUSE_STAFF: 'none',
      VIEWER: 'none',
      VENDOR: 'none',
    },
  },
];

export const PERMISSION_OPTIONS = [
  'company:read',
  'company:write',
  'shop:read',
  'shop:write',
  'storage_location:read',
  'storage_location:write',
  'product:read',
  'product:write',
  'supplier:read',
  'supplier:write',
  'rfq:read',
  'rfq:write',
  'quote:read',
  'quote:write',
  'goods_receipt:create',
  'goods_receipt:read',
  'goods_issue:create',
  'goods_issue:read',
  'damage:create',
  'damage:read',
  'purchase_order:create',
  'purchase_order:read',
  'purchase_order:approve',
  'report:view',
  'report:export',
  'user:manage',
  'audit_log:read',
  'api:manage',
  'billing:manage',
  'vendor_portal:access',
];

export function accessLevelLabel(level: AccessLevel): string {
  if (level === 'full') return 'Full';
  if (level === 'partial') return 'Partial';
  return 'None';
}

export function accessLevelClass(level: AccessLevel): string {
  if (level === 'full') return 'bg-emerald-100 text-emerald-800';
  if (level === 'partial') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-500';
}

export function assignableRolesForActor(actorRole: string | null | undefined): SystemRoleName[] {
  const role = String(actorRole ?? '').toUpperCase();
  if (role === 'OWNER') return SYSTEM_ROLE_ORDER;
  if (role === 'ADMIN') return SYSTEM_ROLE_ORDER.filter((r) => r !== 'OWNER');
  return [];
}
