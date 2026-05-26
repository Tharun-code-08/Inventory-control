import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  function makeStrategy() {
    const prisma = {
      user: { findUnique: jest.fn() },
      shop: { findMany: jest.fn() },
    } as any;
    const config = {
      getOrThrow: jest.fn(() => 'test-secret'),
    } as any;
    const strategy = new JwtStrategy(prisma, config);
    return { strategy, prisma };
  }

  it('rejects access tokens issued before the current password version', async () => {
    const { strategy, prisma } = makeStrategy();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      isActive: true,
      shopId: null,
      passwordChangedAt: new Date('2026-05-25T10:00:00.000Z'),
      role: {
        name: 'ADMIN',
        permissions: [],
      },
      shop: null,
    });

    await expect(
      strategy.validate({
        sub: 'user-1',
        pwd: '2026-05-25T09:59:59.000Z',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts access tokens whose password version matches the user record', async () => {
    const { strategy, prisma } = makeStrategy();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      isActive: true,
      shopId: 'shop-1',
      passwordChangedAt: null,
      role: {
        name: 'ADMIN',
        permissions: ['user:manage'],
      },
      shop: null,
    });

    await expect(strategy.validate({ sub: 'user-1' })).resolves.toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      role: 'ADMIN',
      permissions: ['user:manage'],
    });
  });

  it('includes the assigned shop in tenantShopIds even when it is inactive', async () => {
    const { strategy, prisma } = makeStrategy();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      isActive: true,
      shopId: 'shop-legacy',
      passwordChangedAt: null,
      role: {
        name: 'OWNER',
        permissions: [],
      },
      shop: { companyId: 'co-1' },
    });
    prisma.shop.findMany.mockResolvedValue([{ id: 'shop-active' }]);

    await expect(strategy.validate({ sub: 'user-1' })).resolves.toMatchObject({
      companyId: 'co-1',
      tenantShopIds: ['shop-active', 'shop-legacy'],
    });
  });
});
