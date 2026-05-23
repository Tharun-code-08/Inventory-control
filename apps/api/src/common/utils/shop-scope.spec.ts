import { ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  assertShopScope,
  companyListWhere,
  shopListWhere,
  storageLocationListWhere,
  supplierListWhere,
} from './shop-scope';
import type { RequestUser } from '../types/request-user';

const tenantUser = (overrides: Partial<RequestUser> = {}): RequestUser => ({
  id: 'u1',
  email: 't@example.com',
  role: RoleName.ADMIN,
  shopId: 'shop-1',
  companyId: 'co-1',
  tenantShopIds: ['shop-1', 'shop-2'],
  permissions: [],
  ...overrides,
});

describe('shop-scope helpers', () => {
  test('shopListWhere fails closed without tenant context', () => {
    const where = shopListWhere(tenantUser({ shopId: null, companyId: null, tenantShopIds: [] }));
    expect(where).toEqual({ id: { in: [] } });
  });

  test('assertShopScope rejects foreign shop', () => {
    expect(() => assertShopScope(tenantUser(), 'shop-x')).toThrow(ForbiddenException);
  });

  test('storageLocationListWhere scopes by company', () => {
    const where = storageLocationListWhere(tenantUser(), undefined);
    expect(where).toEqual({ shop: { companyId: 'co-1' } });
  });

  test('companyListWhere scopes to actor company', () => {
    expect(companyListWhere(tenantUser())).toEqual({ id: 'co-1' });
  });

  test('supplierListWhere requires company context', () => {
    expect(() => supplierListWhere(tenantUser({ companyId: null, shopId: null, tenantShopIds: [] }))).toThrow(
      ForbiddenException,
    );
  });
});
