import { HAS_EXPLICIT_DATABASE_URL, restoreExplicitEnv } from './e2e-env';
import '../../src/load-env';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getOptionsToken } from '@nestjs/throttler';
import cookieParser = require('cookie-parser');
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from '../../src/common/interceptors/response-envelope.interceptor';
import { requestContextMiddleware } from '../../src/common/context/request-context.middleware';

export const E2E_DB_ENABLED = HAS_EXPLICIT_DATABASE_URL;

let _sharedApp: INestApplication | null = null;

export async function getSharedE2eApp(): Promise<INestApplication> {
  if (!_sharedApp) {
    _sharedApp = await createE2eApp();
  }
  return _sharedApp;
}

export async function createE2eApp(): Promise<INestApplication> {
  restoreExplicitEnv();
  // The suites share one client IP and log in far more often than the per-IP
  // brute-force limits allow, so rate limiting is disabled for e2e apps.
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(getOptionsToken())
    .useValue({ throttlers: [{ name: 'global', ttl: 60_000, limit: 1 }], skipIf: () => true })
    .compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser(process.env.COOKIE_SECRET ?? 'test-secret-key-for-e2e-only'));
  app.use(requestContextMiddleware());
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
  return app;
}
