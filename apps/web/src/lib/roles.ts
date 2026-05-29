import type { AuthUser } from '@/store/authStore';

export type SystemRoleName =
  | 'OWNER'
  | 'ADMIN'
  | 'INVENTORY_MANAGER'
  | 'PURCHASE_MANAGER'
  | 'SALES'
  | 'EMPLOYEE'
  | 'WAREHOUSE_STAFF'
  | 'VIEWER'
  | 'VENDOR'
  | 'SHOP_USER';

export function normalizeRole(role: string | null | undefined): string {
  return String(role ?? '').toUpperCase();
}

export function isOwnerUser(user: AuthUser | null | undefined): boolean {
  return normalizeRole(user?.role) === 'OWNER';
}

export function isOrgAdminUser(user: AuthUser | null | undefined): boolean {
  const role = normalizeRole(user?.role);
  return role === 'OWNER' || role === 'ADMIN';
}

/** @deprecated Use isOrgAdminUser */
export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return isOrgAdminUser(user);
}

export function isInventoryManagerUser(user: AuthUser | null | undefined): boolean {
  return normalizeRole(user?.role) === 'INVENTORY_MANAGER';
}

export function isShopScopedUser(user: AuthUser | null | undefined): boolean {
  const role = normalizeRole(user?.role);
  return (
    (role === 'SHOP_USER' ||
      role === 'WAREHOUSE_STAFF' ||
      role === 'EMPLOYEE' ||
      role === 'SALES' ||
      role === 'VIEWER' ||
      role === 'VENDOR') &&
    !!user?.shopId
  );
}

export function roleDisplayLabel(role: string | null | undefined): string {
  const map: Record<string, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    INVENTORY_MANAGER: 'Inventory manager',
    PURCHASE_MANAGER: 'Purchase manager',
    SALES: 'Sales',
    EMPLOYEE: 'Employee',
    WAREHOUSE_STAFF: 'Warehouse staff',
    VIEWER: 'Viewer / auditor',
    VENDOR: 'Vendor / supplier',
    SHOP_USER: 'Warehouse staff',
  };
  const key = normalizeRole(role);
  return map[key] ?? key.replace(/_/g, ' ').toLowerCase();
}

export function dashboardHomePath(role: string | null | undefined): string {
  switch (normalizeRole(role)) {
    case 'OWNER':
    case 'ADMIN':
      return '/dashboard';
    case 'INVENTORY_MANAGER':
      return '/warehouse';
    case 'PURCHASE_MANAGER':
      return '/purchase-orders';
    case 'SALES':
      return '/sales';
    case 'WAREHOUSE_STAFF':
    case 'SHOP_USER':
      return '/goods-receipts';
    case 'EMPLOYEE':
      return '/products';
    case 'VIEWER':
      return '/reports';
    case 'VENDOR':
      return '/supplier-portal';
    default:
      return '/products';
  }
}
