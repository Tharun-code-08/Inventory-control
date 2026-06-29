import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextStore } from './request-context';
import { parseTraceparent } from '../observability/traceparent';

export type RequestContextRequest = Request & {
  requestId?: string;
  traceparent?: string | null;
  user?: { id?: string; shopId?: string | null };
};

/** Hook invoked on response `finish`, after the user/shop have been resolved. */
export type RequestContextFinishHook = (info: {
  req: RequestContextRequest;
  res: Response;
  requestId: string;
  traceparent: string | null;
  startedAt: number;
  userId: string | null;
  shopId: string | null;
}) => void;

/**
 * Builds the per-request context middleware shared by the production bootstrap
 * (main.ts) and the e2e bootstrap so both environments resolve `requestId`,
 * propagate the AsyncLocalStorage context, and behave identically. An optional
 * `onFinish` hook lets callers add environment-specific concerns (e.g. the
 * production HTTP access log) without forking the core logic.
 */
export function requestContextMiddleware(onFinish?: RequestContextFinishHook) {
  return (req: RequestContextRequest, res: Response, next: NextFunction) => {
    const requestId = String(req.headers['x-request-id'] ?? randomUUID());
    // W3C traceparent: accept as-is when valid so downstream calls (and Sentry
    // breadcrumbs) can reuse the same trace id. Otherwise drop it; we don't
    // synthesize a fake trace just to mirror back.
    const traceparent = parseTraceparent(req.headers['traceparent'] as string | undefined);
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress =
      (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
      req.ip ||
      req.socket.remoteAddress ||
      null;
    const userAgent =
      typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;

    req.requestId = requestId;
    req.traceparent = traceparent;
    res.setHeader('x-request-id', requestId);
    if (traceparent) {
      res.setHeader('traceparent', traceparent);
    }
    const startedAt = Date.now();

    RequestContextStore.run(
      { requestId, traceparent, userId: null, shopId: null, ipAddress, userAgent },
      () => {
        res.on('finish', () => {
          const userId = req.user?.id ?? null;
          const shopId = req.user?.shopId ?? null;
          RequestContextStore.patch({ userId, shopId });
          onFinish?.({ req, res, requestId, traceparent, startedAt, userId, shopId });
        });
        next();
      },
    );
  };
}
