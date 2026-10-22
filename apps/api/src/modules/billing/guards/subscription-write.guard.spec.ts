import { ForbiddenException } from '@nestjs/common';
import { SubscriptionWriteGuard } from './subscription-write.guard';

function ctx(method: string, url: string, companyId: string | null = 'c1') {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ method, originalUrl: url, user: companyId ? { companyId } : undefined }) }),
  } as never;
}

describe('SubscriptionWriteGuard', () => {
  const blocked = { writeBlockReason: jest.fn().mockResolvedValue('expired') };
  const active = { writeBlockReason: jest.fn().mockResolvedValue(null) };

  it('lets reads through on an expired plan', async () => {
    await expect(new SubscriptionWriteGuard(blocked as never).canActivate(ctx('GET', '/api/v1/products'))).resolves.toBe(true);
  });

  it('blocks writes on an expired plan', async () => {
    await expect(
      new SubscriptionWriteGuard(blocked as never).canActivate(ctx('POST', '/api/v1/purchase-orders')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps billing, auth and exports writable', async () => {
    const guard = new SubscriptionWriteGuard(blocked as never);
    for (const url of ['/api/v1/billing/upgrade', '/api/v1/auth/logout', '/api/v1/backups/jobs']) {
      await expect(guard.canActivate(ctx('POST', url))).resolves.toBe(true);
    }
  });

  it('allows writes on an active plan and for requests without a company', async () => {
    await expect(new SubscriptionWriteGuard(active as never).canActivate(ctx('POST', '/api/v1/products'))).resolves.toBe(true);
    await expect(
      new SubscriptionWriteGuard(blocked as never).canActivate(ctx('POST', '/api/v1/quotation-portal/x', null)),
    ).resolves.toBe(true);
  });
});
