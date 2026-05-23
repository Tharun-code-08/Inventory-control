import type { RoleName } from '@prisma/client';

export type RequestUser = {
  id: string;
  email: string;
  role: RoleName;
  shopId: string | null;
  companyId: string | null;
  /** Shops belonging to the user's company; empty for platform-wide admins. */
  tenantShopIds: string[];
  permissions: string[];
};
