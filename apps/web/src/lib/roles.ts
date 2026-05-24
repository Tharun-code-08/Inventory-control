import type { AuthUser } from '@/store/authStore';

export type SystemRoleName =
  | 'OWNER'
  | 'ADMIN'
  | 'INVENTORY_MANAGER'
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
    WAREHOUSE_STAFF: 'Warehouse staff',
    VIEWER: 'Viewer / auditor',
    VENDOR: 'Vendor / supplier',
    SHOP_USER: 'Warehouse staff',
  };
  const key = normalizeRole(role);
  return map[key] ?? key.replace(/_/g, ' ').toLowerCase();
}

export function dashboardHomePath(role: string | null | undefined): string {
  return isOrgAdminUser({ role } as AuthUser) ? '/dashboard' : '/products';
}
