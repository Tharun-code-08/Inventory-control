import '../../src/load-env';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser = require('cookie-parser');
import { AppModule } from '../../src/app.module';
import { requestContextMiddleware } from '../../src/common/context/request-context.middleware';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from '../../src/common/interceptors/response-envelope.interceptor';

export const E2E_DB_ENABLED = Boolean(process.env.DATABASE_URL);

declare global {
   
  var __E2E_SHARED_APP__: INestApplication | undefined;
}

export async function createE2eApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  const cookieSecret = process.env.COOKIE_SECRET?.trim();
  app.use(cookieParser(cookieSecret && cookieSecret.length > 0 ? cookieSecret : undefined));
  // Mirror production: resolve requestId + AsyncLocalStorage context per request
  // so audit traceability behaves identically under e2e.
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
  app.enableShutdownHooks();
  await app.init();
  return app;
}

/** One Nest app for all workflow suites — avoids leaking BullMQ/Redis handles per file. */
export async function getSharedE2eApp(): Promise<INestApplication> {
  if (!global.__E2E_SHARED_APP__) {
    global.__E2E_SHARED_APP__ = await createE2eApp();
  }
  return global.__E2E_SHARED_APP__;
}

export async function destroySharedE2eApp(): Promise<void> {
  const app = global.__E2E_SHARED_APP__;
  if (!app) return;
  await app.close();
  global.__E2E_SHARED_APP__ = undefined;
}
