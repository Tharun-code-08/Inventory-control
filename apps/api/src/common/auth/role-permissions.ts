import { BadRequestException } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';

/**
 * The `roles` table is shared by every tenant, so a tenant's edits to a
 * role's permissions are stored per company in system_settings and take
 * precedence over the shared defaults.
 */
const KEY_PREFIX = 'role_permissions_v1:company:';

/** Roles whose permissions a tenant may not change. */
export const LOCKED_ROLES: ReadonlySet<RoleName> = new Set([RoleName.OWNER, RoleName.ADMIN]);

const PERMISSION_RE = /^[a-z][a-z_]*:[a-z][a-z_]*$/;

type SettingsReader = {
  systemSetting: {
    findUnique(args: { where: { key: string } }): Promise<{ value: Prisma.JsonValue } | null>;
  };
};

export type RolePermissionOverrides = Partial<Record<RoleName, string[]>>;

export function rolePermissionsKey(companyId: string) {
  return `${KEY_PREFIX}${companyId}`;
}

export async function loadRolePermissionOverrides(
  prisma: SettingsReader,
  companyId: string | null | undefined,
): Promise<RolePermissionOverrides> {
  if (!companyId) return {};
  const row = await prisma.systemSetting.findUnique({ where: { key: rolePermissionsKey(companyId) } });
  const value = row?.value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as RolePermissionOverrides;
}

/** Effective permissions for a role inside one company. */
export async function resolveRolePermissions(
  prisma: SettingsReader,
  companyId: string | null | undefined,
  role: { name: string; permissions: unknown },
): Promise<string[]> {
  const base = (Array.isArray(role.permissions) ? role.permissions : []) as string[];
  if (LOCKED_ROLES.has(role.name as RoleName)) return base;
  const overrides = await loadRolePermissionOverrides(prisma, companyId);
  const own = overrides[role.name as RoleName];
  return Array.isArray(own) ? own : base;
}

/** Rejects wildcards and anything that is not a `resource:action` permission. */
export function assertValidPermissions(permissions: string[]) {
  const bad = permissions.filter((p) => !PERMISSION_RE.test(p));
  if (bad.length > 0) {
    throw new BadRequestException(`Invalid permissions: ${bad.join(', ')}`);
  }
}
