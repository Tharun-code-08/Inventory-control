import type { AuthUser } from '@/store/authStore';

export function hasPermission(user: AuthUser | null | undefined, permission: string) {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'OWNER') return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthUser | null | undefined, ...permissions: string[]) {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'OWNER') return true;
  return permissions.some((p) => user.permissions.includes(p));
}

