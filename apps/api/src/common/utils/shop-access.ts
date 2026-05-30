import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../types/request-user';
import { assertShopScope, isShopScopedRole, tenantCompanyShopWhere } from './shop-scope';

/** Ensure the plant belongs to the signed-in tenant before acting on it. */
export async function verifyShopInTenant(
  prisma: PrismaService,
  user: RequestUser,
  shopId: string,
) {
  if (isShopScopedRole(user.role)) {
    assertShopScope(user, shopId);
    return;
  }

  if (!user.companyId) {
    assertShopScope(user, shopId);
    return;
  }

  const scope = tenantCompanyShopWhere(user);
  if (!scope) {
    assertShopScope(user, shopId);
    return;
  }

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ...scope },
    select: { id: true, companyId: true },
  });
  if (!shop) {
    throw new ForbiddenException('Plant is outside your organisation');
  }
}

/** Link orphan plants created by users in this organisation. */
export async function repairOrphanShopsForUser(prisma: PrismaService, user: RequestUser) {
  if (!user.companyId) return;
  const companyUsers = await prisma.user.findMany({
    where: { shop: { companyId: user.companyId } },
    select: { id: true },
  });
  const creatorIds = [...new Set([user.id, ...companyUsers.map((row) => row.id)])];
  await prisma.shop.updateMany({
    where: {
      companyId: null,
      createdById: { in: creatorIds },
    },
    data: { companyId: user.companyId },
  });
}
