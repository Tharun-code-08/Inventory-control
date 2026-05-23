import type { AuthUser } from '@/store/authStore';

export function isShopOnlyUser(user: AuthUser | null | undefined): boolean {
  return user?.role === 'SHOP_USER' && !!user.shopId;
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return user?.role === 'ADMIN';
}

export function defaultShopId(user: AuthUser | null | undefined): string {
  if (isShopOnlyUser(user) && user?.shopId) return user.shopId;
  return '';
}
