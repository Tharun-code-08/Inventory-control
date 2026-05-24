import type { AuthUser } from '@/store/authStore';
import { isOrgAdminUser, isShopScopedUser } from '@/lib/roles';

/** Sentinel value for user forms meaning "no plant restriction" (admin users). */
export const ALL_SHOPS_OPTION = '__all_shops__';

export function toAllShopsSelection(shopId: string | null | undefined): string {
  return shopId ?? ALL_SHOPS_OPTION;
}

export function normalizeAllShopsSelection(value: string): string | undefined {
  if (!value || value === ALL_SHOPS_OPTION) return undefined;
  return value;
}

/** Plant-locked accounts (warehouse staff, viewer, vendor, legacy shop user). */
export function isShopOnlyUser(user: AuthUser | null | undefined): boolean {
  return isShopScopedUser(user);
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return isOrgAdminUser(user);
}

/** Plant filter sent to GET /products — admins/inventory managers may use "all". */
export function productListShopId(
  user: AuthUser | null | undefined,
  listShopFilter: string,
): string | undefined {
  if (isShopOnlyUser(user)) {
    return user!.shopId!;
  }
  return listShopFilter === 'all' ? undefined : listShopFilter;
}
