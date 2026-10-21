import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { UsersService } from './users.service';

const admin: RequestUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: RoleName.ADMIN,
  shopId: 'shop-1',
  companyId: 'co-1',
  tenantShopIds: ['shop-1'],
  permissions: ['user:manage'],
};
const owner: RequestUser = { ...admin, id: 'owner-1', role: RoleName.OWNER };

const ownerRow = {
  id: 'owner-1',
  email: 'owner@example.com',
  roleId: 'role-owner',
  shopId: 'shop-1',
  isActive: true,
  role: { id: 'role-owner', name: RoleName.OWNER },
};

function build(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(ownerRow), count: jest.fn().mockResolvedValue(0), update: jest.fn() },
    shop: { findUnique: jest.fn().mockResolvedValue({ companyId: 'co-1' }) },
    role: { findFirst: jest.fn(), findMany: jest.fn() },
    systemSetting: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    ...prismaOverrides,
  } as any;
  const audit = { log: jest.fn(), logTenant: jest.fn() } as any;
  const service = new UsersService(prisma, { get: jest.fn() } as any, audit, {} as any, {} as any, {} as any, { del: jest.fn() } as any);
  return { service, prisma };
}

describe('UsersService owner protection', () => {
  it('stops an Admin from resetting the Owner password', async () => {
    const { service, prisma } = build();
    await expect(service.update(admin, 'owner-1', { password: 'NewPassw0rd!' } as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('stops an Admin from deleting the Owner', async () => {
    const { service } = build();
    await expect(service.remove(admin, 'owner-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses to remove the last active Owner', async () => {
    const { service } = build();
    const other: RequestUser = { ...owner, id: 'owner-2' };
    await expect(service.remove(other, 'owner-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('never selects credential columns', async () => {
    const { service, prisma } = build();
    await service.get(owner, 'owner-1');
    expect(prisma.user.findUnique.mock.calls[0][0].omit).toEqual({
      passwordHash: true,
      refreshTokenHash: true,
      mfaSecretEncrypted: true,
    });
  });
});

describe('UsersService role permissions', () => {
  it('saves edits as a company override instead of changing the shared role', async () => {
    const { service, prisma } = build({
      role: { findFirst: jest.fn().mockResolvedValue({ id: 'r-sales', name: RoleName.SALES, permissions: [] }) },
    });
    await service.updateRolePermissions(admin, 'SALES', ['quote:read']);
    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'role_permissions_v1:company:co-1' } }),
    );
    expect(prisma.role.update).toBeUndefined();
  });

  it('refuses to edit Owner or Admin permissions', async () => {
    const { service } = build({
      role: { findFirst: jest.fn().mockResolvedValue({ id: 'r-admin', name: RoleName.ADMIN, permissions: [] }) },
    });
    await expect(service.updateRolePermissions(owner, 'ADMIN', ['quote:read'])).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects the wildcard permission', async () => {
    const { service } = build({
      role: { findFirst: jest.fn().mockResolvedValue({ id: 'r-sales', name: RoleName.SALES, permissions: [] }) },
    });
    await expect(service.updateRolePermissions(owner, 'SALES', ['*'])).rejects.toBeInstanceOf(BadRequestException);
  });
});
