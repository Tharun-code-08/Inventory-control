import type { AuthUser } from '@/store/authStore';

/** Sentinel value for user forms meaning "no plant restriction" (admin users). */
export const ALL_SHOPS_OPTION = '__all_shops__';

export function toAllShopsSelection(shopId: string | null | undefined): string {
  return shopId ?? ALL_SHOPS_OPTION;
}

export function normalizeAllShopsSelection(value: string): string | undefined {
  if (!value || value === ALL_SHOPS_OPTION) return undefined;
  return value;
}

/** Only SHOP_USER accounts are locked to a single plant. */
export function isShopOnlyUser(user: AuthUser | null | undefined): boolean {
  return user?.role === 'SHOP_USER' && !!user.shopId;
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return user?.role === 'ADMIN';
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
