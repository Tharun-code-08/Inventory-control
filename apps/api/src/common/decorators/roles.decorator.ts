import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route handler to the given roles. Used with {@link RolesGuard}.
 * Handlers with no @Roles are unrestricted (JWT auth still applies).
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
