import { BadRequestException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { assertValidPermissions, resolveRolePermissions, rolePermissionsKey } from './role-permissions';

function prismaWith(value: unknown) {
  return { systemSetting: { findUnique: jest.fn().mockResolvedValue(value === undefined ? null : { value }) } };
}

describe('resolveRolePermissions', () => {
  const sales = { name: RoleName.SALES, permissions: ['quote:read'] };

  it('uses the company override when one exists', async () => {
    const prisma = prismaWith({ SALES: ['quote:read', 'quote:write'] });
    await expect(resolveRolePermissions(prisma, 'co-1', sales)).resolves.toEqual(['quote:read', 'quote:write']);
    expect(prisma.systemSetting.findUnique).toHaveBeenCalledWith({ where: { key: rolePermissionsKey('co-1') } });
  });

  it('falls back to the shared role row', async () => {
    await expect(resolveRolePermissions(prismaWith(undefined), 'co-1', sales)).resolves.toEqual(['quote:read']);
  });

  it('ignores overrides for Owner and Admin', async () => {
    const prisma = prismaWith({ OWNER: [] });
    const owner = { name: RoleName.OWNER, permissions: ['user:manage'] };
    await expect(resolveRolePermissions(prisma, 'co-1', owner)).resolves.toEqual(['user:manage']);
    expect(prisma.systemSetting.findUnique).not.toHaveBeenCalled();
  });

  it('skips the lookup without a company', async () => {
    const prisma = prismaWith({ SALES: [] });
    await expect(resolveRolePermissions(prisma, null, sales)).resolves.toEqual(['quote:read']);
  });
});

describe('assertValidPermissions', () => {
  it('rejects wildcards and malformed entries', () => {
    expect(() => assertValidPermissions(['*'])).toThrow(BadRequestException);
    expect(() => assertValidPermissions(['quote'])).toThrow(BadRequestException);
    expect(() => assertValidPermissions(['quote:read', 'report:export'])).not.toThrow();
  });
});
