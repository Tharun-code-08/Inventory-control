import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

let initialized = false;

/**
 * Initialize Sentry once at boot. No-op if SENTRY_DSN is not set so dev/test
 * environments don't accidentally ship local errors upstream.
 */
export function initSentry(): boolean {
  if (initialized) return true;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
  });
  initialized = true;
  new Logger('Sentry').log('Sentry initialized');
  return true;
}

export function isSentryEnabled(): boolean {
  return initialized;
}

export function captureServerError(
  error: unknown,
  context: { requestId?: string | null; route?: string | null; userId?: string | null } = {},
): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context.requestId) scope.setTag('request_id', context.requestId);
    if (context.route) scope.setTag('route', context.route);
    if (context.userId) scope.setUser({ id: context.userId });
    Sentry.captureException(error);
  });
}
