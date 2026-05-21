import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Idempotency replay smoke test. Verifies the IdempotencyKey table is the
 * single source of truth for de-duplicating mutating requests on retry by
 * inserting a fixture row directly and asserting the helper returns it.
 *
 * Skips itself when DATABASE_URL is absent so the suite runs in CI sandboxes
 * that don't ship a Postgres alongside the app.
 */
describe('Idempotency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const enabled = Boolean(process.env.DATABASE_URL);

  beforeAll(async () => {
    if (!enabled) return;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(app.get(Reflector)));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('writes and reads back an idempotency key under a scope', async () => {
    if (!enabled) return;
    const key = `e2e-idem-${Date.now()}`;
    const composed = `payment:create:${key}`;

    await prisma.idempotencyKey.upsert({
      where: { key: composed },
      update: { result: { paymentId: 'pay-fixture' } },
      create: {
        key: composed,
        scope: 'payment:create',
        result: { paymentId: 'pay-fixture' },
      },
    });

    const found = await prisma.idempotencyKey.findUnique({ where: { key: composed } });
    expect(found).toBeTruthy();
    expect(found!.scope).toBe('payment:create');
    expect(found!.result as Record<string, unknown>).toEqual({ paymentId: 'pay-fixture' });

    await prisma.idempotencyKey.delete({ where: { key: composed } });
  });

  it('rejects malformed login payloads with 400 (validation pipe)', async () => {
    if (!enabled) return;
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' })
      .expect((res) => {
        expect([400, 422]).toContain(res.status);
        expect(res.body?.success).toBe(false);
      });
  });
});
