import request = require('supertest');
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { E2E_DB_ENABLED, getSharedE2eApp } from '../helpers/e2e-bootstrap';
import { authed, unwrap } from '../helpers/e2e-http';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SubscriptionService } from '../../src/modules/billing/subscription.service';

describe('Expired subscription → read-only', () => {
  jest.setTimeout(30_000);

  it('blocks writes after the grace period but keeps reads and billing working', async () => {
    if (!E2E_DB_ENABLED) return;
    const app = await getSharedE2eApp();
    const prisma = app.get(PrismaService);
    const subscriptions = app.get(SubscriptionService);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.SEED_ADMIN_EMAIL ?? 'admin@retailims.com', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123' });
    const { accessToken, user } = unwrap<{ accessToken: string; user: { id: string } }>(login.body);
    const api = authed(app, accessToken);
    const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { shop: true } });
    const companyId = me.shop!.companyId!;
    const before = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

    try {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionPlan: SubscriptionPlan.PRO,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionEndsAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      });
      subscriptions.clearWriteBlockCache(companyId);

      const write = await api.post('/api/v1/customers').send({ customerName: 'Blocked Co' });
      expect(write.status).toBe(403);
      expect(write.body.error.code).toBe('SUBSCRIPTION_READ_ONLY');

      expect((await api.get('/api/v1/customers')).status).toBe(200);
      // Billing stays reachable so the user can renew (404/400 are fine, 403 is not).
      expect((await api.post('/api/v1/billing/upgrade').send({})).status).not.toBe(403);

      // Within the grace period writes still work.
      await prisma.company.update({
        where: { id: companyId },
        data: { subscriptionEndsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      });
      subscriptions.clearWriteBlockCache(companyId);
      expect((await api.post('/api/v1/customers').send({ customerName: 'Grace Co' })).status).not.toBe(403);
    } finally {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionPlan: before.subscriptionPlan,
          subscriptionStatus: before.subscriptionStatus,
          subscriptionEndsAt: before.subscriptionEndsAt,
        },
      });
      subscriptions.clearWriteBlockCache(companyId);
    }
  });
});
