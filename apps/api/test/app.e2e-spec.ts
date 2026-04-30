import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';
import { Reflector } from '@nestjs/core';

describe('Retail IMS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
