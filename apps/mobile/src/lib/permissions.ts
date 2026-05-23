import type { AuthUser } from '@/store/authStore';

export function hasPermission(user: AuthUser | null | undefined, permission: string) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.permissions.includes(permission);
}
