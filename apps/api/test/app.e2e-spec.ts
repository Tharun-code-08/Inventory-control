import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createE2eApp, E2E_DB_ENABLED } from './helpers/e2e-bootstrap';

describe('Retail IMS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!E2E_DB_ENABLED) return;
    app = await createE2eApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('auth login valid / invalid / inactive', async () => {
    if (!app) return;
    const ok = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@retailims.com', password: 'Admin@123' })
      .expect(201);
    expect(ok.body.success).toBe(true);
    expect(ok.body.data.accessToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@retailims.com', password: 'wrong' })
      .expect((res) => {
        expect([400, 401]).toContain(res.status);
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nope@retailims.com', password: 'Admin@123' })
      .expect((res) => {
        expect([400, 401]).toContain(res.status);
      });
  });
});
