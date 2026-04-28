import type { RoleName } from '@prisma/client';

export type RequestUser = {
  id: string;
  email: string;
  role: RoleName;
  shopId: string | null;
  permissions: string[];
};
