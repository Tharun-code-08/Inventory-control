import { ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function ctxFor(role?: RoleName) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as never;
}

function guardWith(required: RoleName[] | undefined) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) };
  return new RolesGuard(reflector as never);
}

describe('RolesGuard', () => {
  it('allows handlers with no @Roles metadata', () => {
    expect(guardWith(undefined).canActivate(ctxFor(RoleName.VIEWER))).toBe(true);
    expect(guardWith([]).canActivate(ctxFor(RoleName.VIEWER))).toBe(true);
  });

  it('allows a user holding one of the required roles', () => {
    const g = guardWith([RoleName.OWNER, RoleName.ADMIN]);
    expect(g.canActivate(ctxFor(RoleName.ADMIN))).toBe(true);
  });

  it('rejects a user without a required role', () => {
    const g = guardWith([RoleName.OWNER, RoleName.ADMIN]);
    expect(() => g.canActivate(ctxFor(RoleName.SALES))).toThrow(ForbiddenException);
  });

  it('rejects an unauthenticated request when roles are required', () => {
    const g = guardWith([RoleName.OWNER]);
    expect(() => g.canActivate(ctxFor(undefined))).toThrow(ForbiddenException);
  });
});
