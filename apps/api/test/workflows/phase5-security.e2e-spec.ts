import type { INestApplication } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import request = require('supertest');
import { PrismaService } from '../../src/prisma/prisma.service';
import { E2E_DB_ENABLED, getSharedE2eApp } from '../helpers/e2e-bootstrap';
import { authed, login, uniqueCode, unwrap } from '../helpers/e2e-http';

/**
 * Phase 5 — Security: authentication boundaries and role-based API protection.
 * Never trust the frontend alone — permissions are enforced server-side.
 */
describe('Phase 5 — Security workflows (e2e)', () => {
  let app: INestApplication;
  jest.setTimeout(60_000);

  beforeAll(async () => {
    if (!E2E_DB_ENABLED) return;
    app = await getSharedE2eApp();
  });

  it('rejects unauthenticated access to protected master-data routes', async () => {
    if (!E2E_DB_ENABLED) return;
    await request(app.getHttpServer()).get('/api/v1/companies').expect(401);
    await request(app.getHttpServer()).post('/api/v1/products').send({}).expect(401);
  });

  it('rejects invalid login and accepts admin session', async () => {
    if (!E2E_DB_ENABLED) return;
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@retailims.com', password: 'wrong-password' })
      .expect((res) => expect([400, 401]).toContain(res.status));

    const session = await login(app);
    expect(session.accessToken).toBeTruthy();
    expect(['OWNER', 'ADMIN']).toContain(session.user.role);
  });

  it('denies company write for shop-scoped users (API authorization)', async () => {
    if (!E2E_DB_ENABLED) return;
    const prisma = app.get(PrismaService);
    const shopRole = await prisma.role.findFirstOrThrow({
      where: { name: RoleName.WAREHOUSE_STAFF },
    });
    const shop = await prisma.shop.findFirstOrThrow();
    const email = `e2e-shop-${uniqueCode('U').toLowerCase()}@e2e.local`;

    const bcrypt = await import('bcrypt');
    await prisma.user.create({
      data: {
        name: 'E2E Shop User',
        email,
        passwordHash: await bcrypt.hash('TestPass@1234', 12),
        roleId: shopRole.id,
        shopId: shop.id,
        isActive: true,
      },
    });

    const shopSession = await login(app, email, 'TestPass@1234');
    await authed(app, shopSession.accessToken)
      .post('/api/v1/companies')
      .send({ companyName: 'Should Fail' })
      .expect(403);

    await authed(app, shopSession.accessToken).get('/api/v1/products').expect(200);

    // Logging in writes an audit row that references this user; the
    // audit_logs.user_id FK is RESTRICT, so clear those rows before deleting.
    const shopUser = await prisma.user.findUnique({ where: { email } });
    if (shopUser) {
      await prisma.auditLog.deleteMany({ where: { userId: shopUser.id } });
      await prisma.user.delete({ where: { id: shopUser.id } });
    }
  });

  it('allows admin to manage companies end-to-end', async () => {
    if (!E2E_DB_ENABLED) return;
    const { accessToken: token } = await login(app);
    const list = unwrap<unknown[]>(
      (await authed(app, token).get('/api/v1/companies')).body,
    );
    expect(Array.isArray(list)).toBe(true);
  });
});
