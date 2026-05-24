import { ForbiddenException } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import type { RequestUser } from '../types/request-user';

export function assertShopScope(user: RequestUser, shopId: string | null | undefined) {
  if (!shopId) return;
  if (
    user.role === RoleName.SHOP_USER ||
    user.role === RoleName.WAREHOUSE_STAFF ||
    user.role === RoleName.VIEWER ||
    user.role === RoleName.VENDOR
  ) {
    if (!user.shopId || user.shopId !== shopId) {
      throw new ForbiddenException('Shop scope mismatch');
    }
    return;
  }
  const tenantShops = shopIdsForUser(user);
  if (tenantShops && tenantShops.length > 0) {
    if (!tenantShops.includes(shopId)) {
      throw new ForbiddenException('Shop scope mismatch');
    }
    return;
  }
  if (user.companyId) {
    throw new ForbiddenException('Shop scope mismatch');
  }
  if (user.shopId) {
    if (user.shopId !== shopId) {
      throw new ForbiddenException('Shop scope mismatch');
    }
    return;
  }
  throw new ForbiddenException('Shop scope mismatch');
}

/** Default plant filter: shop users and tenant admins are scoped; platform admins are not. */
export function defaultShopFilter(user: RequestUser): string | undefined {
  if (
    user.role === RoleName.SHOP_USER ||
    user.role === RoleName.WAREHOUSE_STAFF ||
    user.role === RoleName.VIEWER ||
    user.role === RoleName.VENDOR
  ) {
    return user.shopId ?? undefined;
  }
  if (user.companyId && user.shopId) {
    return user.shopId;
  }
  return undefined;
}

export function shopIdsForUser(user: RequestUser): string[] | undefined {
  if (user.tenantShopIds && user.tenantShopIds.length > 0) {
    return user.tenantShopIds;
  }
  if (user.shopId) {
    return [user.shopId];
  }
  return undefined;
}

export function companyIdForUser(user: RequestUser): string | undefined {
  return user.companyId ?? undefined;
}

/**
 * Strictly require a tenant company context. Throws if missing to avoid
 * accidental global access.
 */
export function requireCompanyId(user: RequestUser): string {
  const companyId = companyIdForUser(user);
  if (!companyId) {
    throw new ForbiddenException('Organisation scope is required');
  }
  return companyId;
}

export function assertCompanyScope(user: RequestUser, companyId: string | null | undefined) {
  if (!companyId) return;
  if (user.companyId && user.companyId !== companyId) {
    throw new ForbiddenException('Company scope mismatch');
  }
}

/** Companies visible to the signed-in user (one org per tenant admin). */
export function companyListWhere(actor: RequestUser): Prisma.CompanyWhereInput {
  const companyId = companyIdForUser(actor);
  if (companyId) {
    return { id: companyId };
  }
  return { id: { in: [] } };
}

export function assertCompanyInTenant(actor: RequestUser, targetCompanyId: string) {
  const companyId = requireCompanyId(actor);
  if (targetCompanyId !== companyId) {
    throw new ForbiddenException('Company is outside your organisation');
  }
}

/**
 * Tenant-aware user filter used by the Users module.
 * - Tenant admins: all users whose shopId is in their tenant's shops.
 * - Shop users: only their own shop.
 * - Platform/demo admins (no company/shop): only users with no shopId.
 */
export function userListWhere(actor: RequestUser): Prisma.UserWhereInput {
  const tenantShops = shopIdsForUser(actor);
  if (tenantShops && tenantShops.length > 0) {
    return { shopId: { in: tenantShops } };
  }
  if (actor.shopId) {
    return { shopId: actor.shopId };
  }
  if (actor.companyId) {
    return { shop: { companyId: actor.companyId } };
  }
  // No tenant context -> fail closed
  return { shopId: { in: [] } };
}

/**
 * Enforce that target users belong to the actor's tenant scope.
 */
export function assertUserInTenant(actor: RequestUser, targetShopId: string | null) {
  if (!actor.companyId && !actor.shopId) {
    throw new ForbiddenException('Organisation scope is required');
  }
  // Shop-user constraint (covers shop-only roles)
  assertShopScope(actor, targetShopId);

  // Tenant admins: disallow acting on users outside their company's shops or unscoped users.
  if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
    if (!targetShopId || !actor.tenantShopIds.includes(targetShopId)) {
      throw new ForbiddenException('User is outside your organisation');
    }
  }
}

/** Plants visible to the signed-in user. */
export function shopListWhere(actor: RequestUser): Prisma.ShopWhereInput {
  const tenantShops = shopIdsForUser(actor);
  if (tenantShops && tenantShops.length > 0) {
    return { id: { in: tenantShops } };
  }
  if (actor.companyId) {
    return { companyId: actor.companyId };
  }
  if (actor.shopId) {
    return { id: actor.shopId };
  }
  // No tenant context -> fail closed
  return { id: { in: [] } };
}

/** Storage locations scoped via shop → company. */
export function storageLocationListWhere(
  actor: RequestUser,
  shopId?: string,
): Prisma.StorageLocationWhereInput {
  const companyId = companyIdForUser(actor);

  if (shopId) {
    assertShopScope(actor, shopId);
    if (companyId) {
      return { shopId, shop: { companyId } };
    }
    return { shopId };
  }

  if (companyId) {
    return { shop: { companyId } };
  }

  const tenantShops = shopIdsForUser(actor);
  if (tenantShops && tenantShops.length > 0) {
    return { shopId: { in: tenantShops } };
  }
  if (actor.shopId) {
    return { shopId: actor.shopId };
  }
  // No tenant context -> fail closed
  return { shopId: { in: [] } };
}

/** Suppliers are company-scoped (not shop-scoped). */
export function supplierListWhere(actor: RequestUser): Prisma.SupplierWhereInput {
  const companyId = requireCompanyId(actor);
  return { companyId };
}

export function assertSupplierInTenant(actor: RequestUser, supplierCompanyId: string | null) {
  const companyId = requireCompanyId(actor);
  if (supplierCompanyId !== companyId) {
    throw new ForbiddenException('Supplier is outside your organisation');
  }
}
