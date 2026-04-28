import { ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { RequestUser } from '../types/request-user';

export function assertShopScope(user: RequestUser, shopId: string | null | undefined) {
  if (!shopId) return;
  if (user.role !== RoleName.SHOP_USER) return;
  if (!user.shopId || user.shopId !== shopId) {
    throw new ForbiddenException('Shop scope mismatch');
  }
}

export function defaultShopFilter(user: RequestUser): string | undefined {
  if (user.role === RoleName.SHOP_USER) {
    return user.shopId ?? undefined;
  }
  return undefined;
}
