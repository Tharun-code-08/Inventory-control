import './load-env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';

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

function corsOptions(): CorsOptions {
  const allowList = webCorsOrigin();
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
      // Allow Cloudflare quick tunnel hosts for temporary deployments.
      if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: false });
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
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
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(app.get(Reflector)));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Retail IMS API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Prefer platform-provided PORT, fall back to API_PORT/.env and default 3000
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
