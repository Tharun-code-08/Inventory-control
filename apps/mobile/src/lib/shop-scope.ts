import type { AuthUser } from '@/store/authStore';

export function isShopOnlyUser(user: AuthUser | null | undefined): boolean {
  return user?.role === 'SHOP_USER' && !!user.shopId;
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  const role = user?.role?.toUpperCase();
  return role === 'ADMIN' || role === 'OWNER';
}

export function defaultShopId(user: AuthUser | null | undefined): string {
  if (isShopOnlyUser(user) && user?.shopId) return user.shopId;
  return '';
}
