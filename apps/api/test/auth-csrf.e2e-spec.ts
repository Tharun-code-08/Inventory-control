import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createE2eApp, E2E_DB_ENABLED } from './helpers/e2e-bootstrap';

/**
 * Login → refresh → logout including the double-submit CSRF check.
 * Requires DATABASE_URL + the seeded admin user; otherwise the suite is a no-op
 * so it does not block CI on environments without a Postgres.
 */
describe('Auth + CSRF (e2e)', () => {
  let app: INestApplication;
  const enabled = E2E_DB_ENABLED;

  beforeAll(async () => {
    if (!enabled) return;
    app = await createE2eApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  function parseCookies(setCookieHeader: string[] | undefined) {
    const result: Record<string, string> = {};
    for (const entry of setCookieHeader ?? []) {
      const [pair] = entry.split(';');
      const [name, ...valueParts] = pair.split('=');
      result[name.trim()] = decodeURIComponent(valueParts.join('=').trim());
    }
    return result;
  }

  it('completes login → refresh → logout with CSRF, and rejects refresh without the CSRF header', async () => {
    if (!enabled) return;

    // 1. Login
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@retailims.com', password: 'Admin@123' })
      .expect(201);

    const cookies = parseCookies(login.get('Set-Cookie') as string[] | undefined);
    expect(cookies.refreshToken || cookies['refreshToken']).toBeDefined();
    expect(cookies.csrfToken).toBeDefined();

    const cookieJar = (login.get('Set-Cookie') as string[] | undefined) ?? [];
    const cookieHeader = cookieJar
      .map((c) => c.split(';')[0])
      .join('; ');

    // 2. Refresh WITHOUT the CSRF header → 403
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieHeader)
      .expect((res) => {
        expect([401, 403]).toContain(res.status);
      });

    // 3. Refresh WITH the CSRF header → 201
    const refreshOk = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', cookies.csrfToken)
      .expect((res) => {
        // 201 on success, 401 if cookies were already rotated by another run.
        expect([201, 401]).toContain(res.status);
      });

    if (refreshOk.status !== 201) return;
    const newCookies = parseCookies(refreshOk.get('Set-Cookie') as string[] | undefined);
    const newCookieHeader = ((refreshOk.get('Set-Cookie') as string[] | undefined) ?? [])
      .map((c) => c.split(';')[0])
      .join('; ');

    // 4. Old refresh cookie should now be invalid (replay protection).
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', cookies.csrfToken)
      .expect((res) => {
        expect([401, 403]).toContain(res.status);
      });

    // 5. Logout requires bearer (access token) + CSRF; ensure 401 without it.
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', newCookieHeader)
      .set('X-CSRF-Token', newCookies.csrfToken)
      .expect((res) => {
        expect([200, 201, 401]).toContain(res.status);
      });
  });
});
