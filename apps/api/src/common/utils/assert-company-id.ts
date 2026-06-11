import type { RequestUser } from '../types/request-user';

/**
 * Ensure the request user has a companyId.
 * Throws a clear error if missing.
 */
export function assertCompanyId(user: RequestUser): string {
  if (!user.companyId) {
    throw new Error(`Audit log attempted without companyId. userId=${user.id}`);
  }
  return user.companyId;
}
