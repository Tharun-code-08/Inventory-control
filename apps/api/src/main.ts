import './load-env';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppModule } from './app.module';
import { RequestContextStore } from './common/context/request-context';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DeprecationInterceptor } from './common/interceptors/deprecation.interceptor';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { initSentry } from './common/observability/sentry';
import { parseTraceparent } from './common/observability/traceparent';

function webCorsOrigin(): string[] {
  const raw = process.env.WEB_ORIGIN?.trim();
  if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  return defaultWebOrigins();
}

function defaultWebOrigins(): string[] {
  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5200',
    'http://127.0.0.1:5200',
  ];
}

function tunnelOriginsAllowed(): boolean {
  const flag = String(process.env.ALLOW_TUNNEL_ORIGINS ?? '').toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes') return true;
  // Auto-allow for non-production unless explicitly disabled.
  return process.env.NODE_ENV !== 'production' && flag !== 'false';
}

function corsOptions(): CorsOptions {
  const allowList = webCorsOrigin();
  const allowTunnels = tunnelOriginsAllowed();
  return {
    origin: (origin, callback) => {
      // Non-browser/CLI requests may not send Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowList.includes(origin)) {
        callback(null, true);
        return;
      }
      if (allowTunnels && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    // Expose RFC 8594 deprecation headers and request-correlation headers so
    // the SPA can surface them in dev tools / log them.
    exposedHeaders: ['Deprecation', 'Sunset', 'Link', 'x-request-id', 'traceparent'],
  };
}

async function bootstrap() {
  // Sentry must initialize before NestFactory.create so any boot-time errors
  // are captured. No-op when SENTRY_DSN is unset.
  initSentry();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: false });
  const httpLogger = new Logger('Http');

  // Drain SIGTERM/SIGINT through Nest's lifecycle so PrismaService.onModuleDestroy
  // and BullShutdownService.beforeApplicationShutdown can finish in-flight work
  // before the process exits.
  app.enableShutdownHooks();

  // Serve uploaded avatars under `/uploads/*` so the SPA can <img src> them.
  // Path matches AvatarStorageService.store() output. Kept outside `api/v1`
  // because these are user-generated static assets, not API endpoints.
  const uploadDir = path.resolve(process.env.UPLOAD_STORAGE_DIR ?? './storage/uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  app.setGlobalPrefix('api/v1');

  // Helmet hardens common HTTP response headers (HSTS, X-Frame-Options, etc.).
  // CSP is left disabled by default because this API is not the document host
  // (the SPA is served separately and configures its own CSP).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const cookieSecret = process.env.COOKIE_SECRET?.trim();
  app.use(cookieParser(cookieSecret && cookieSecret.length > 0 ? cookieSecret : undefined));

  app.use(
    (
      req: Request & {
        requestId?: string;
        traceparent?: string | null;
        user?: { id?: string; shopId?: string | null };
      },
      res: Response,
      next: NextFunction,
    ) => {
      const requestId = String(req.headers['x-request-id'] ?? randomUUID());
      // W3C traceparent: accept as-is when valid so downstream calls (and Sentry
      // breadcrumbs) can reuse the same trace id. Otherwise drop it; we don't
      // synthesize a fake trace just to mirror back.
      const traceparent = parseTraceparent(req.headers['traceparent'] as string | undefined);

      req.requestId = requestId;
      req.traceparent = traceparent;
      res.setHeader('x-request-id', requestId);
      if (traceparent) {
        res.setHeader('traceparent', traceparent);
      }
      const startedAt = Date.now();

      RequestContextStore.run({ requestId, traceparent, userId: null, shopId: null }, () => {
        res.on('finish', () => {
          const finalUserId = (req as { user?: { id?: string } }).user?.id ?? null;
          const finalShopId = (req as { user?: { shopId?: string | null } }).user?.shopId ?? null;
          RequestContextStore.patch({ userId: finalUserId, shopId: finalShopId });
          // Emit one structured JSON log line per HTTP request. The NestJS
          // logger pipeline serialises each call via its own formatter, so we
          // pre-stringify to keep the payload as a single JSON object that can
          // be ingested by Loki/CloudWatch/etc.
          httpLogger.log(
            JSON.stringify({
              event: 'http_request',
              requestId,
              traceparent,
              method: req.method,
              path: req.originalUrl ?? req.url,
              statusCode: res.statusCode,
              latencyMs: Date.now() - startedAt,
              userId: finalUserId,
              shopId: finalShopId,
            }),
          );
        });
        next();
      });
    },
  );
  app.enableCors(corsOptions());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  const reflector = app.get(Reflector);
  // Deprecation runs before the envelope so headers are already on the response
  // when the envelope writes the JSON body.
  app.useGlobalInterceptors(
    new DeprecationInterceptor(reflector),
    new ResponseEnvelopeInterceptor(reflector),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Retail IMS API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Prefer platform-provided PORT, fall back to API_PORT/.env and default 3000.
  // Bind 0.0.0.0 so phones/emulators on the LAN can reach the API (not only 127.0.0.1).
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  const host = process.env.API_HOST?.trim() || '0.0.0.0';
  await app.listen(port, host);
  httpLogger.log(`API listening on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
}

bootstrap();
