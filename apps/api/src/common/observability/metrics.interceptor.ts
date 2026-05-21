import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

/**
 * Wraps every HTTP request in a Prometheus histogram timer. We strip path
 * params out of the route so dashboards don't blow up on cardinality (e.g.
 * `/users/abc-123` and `/users/def-456` collapse to `/users/:id`).
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();
    const start = process.hrtime.bigint();

    const route = this.routeOf(req, context);
    const method = req.method;

    return next.handle().pipe(
      tap({
        next: () => this.record(start, route, method, String(res.statusCode)),
        error: (err: { status?: number }) => {
          const status = String(err?.status ?? 500);
          this.record(start, route, method, status);
          if (Number(status) >= 500) {
            this.metrics.httpErrors.labels(route, method, status).inc();
          }
        },
      }),
    );
  }

  private record(startNs: bigint, route: string, method: string, status: string) {
    const seconds = Number(process.hrtime.bigint() - startNs) / 1e9;
    this.metrics.httpRequestDuration.labels(route, method, status).observe(seconds);
  }

  private routeOf(req: Request, context: ExecutionContext): string {
    // Nest exposes the controller path + handler path via metadata; the cheapest
    // accurate route comes from `req.route?.path` when available.
    const baseUrl = req.baseUrl ?? '';
    const routedPath = (req as Request & { route?: { path?: string } }).route?.path;
    if (routedPath) return `${baseUrl}${routedPath}`;
    const handler = context.getHandler();
    const ctrl = context.getClass();
    return `${ctrl.name}.${handler.name}`;
  }
}
