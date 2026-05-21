import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { DEPRECATED_KEY, type DeprecatedMeta } from '../decorators/deprecated.decorator';

/**
 * Reads {@link Deprecated} metadata off the matched route and stamps the
 * RFC 8594 / RFC 7234 response headers on every response:
 *   - `Deprecation: true`
 *   - `Sunset: <RFC 1123 date>`
 *   - `Link: <url>; rel="deprecation"` when a migration link is provided.
 *
 * We set the headers BEFORE the response is flushed (in `tap` rather than
 * `map`) so headers are present whether the handler completes successfully
 * or the global filter ends up turning the result into an error envelope.
 */
@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<DeprecatedMeta>(DEPRECATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return next.handle();

    const res = context.switchToHttp().getResponse<{
      setHeader(name: string, value: string): void;
    }>();
    try {
      const sunset = new Date(meta.sunsetAt);
      const sunsetHeader = isNaN(sunset.getTime())
        ? meta.sunsetAt
        : sunset.toUTCString();
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', sunsetHeader);
      if (meta.link) {
        res.setHeader('Link', `<${meta.link}>; rel="deprecation"`);
      }
    } catch {
      // Header writes should never abort the response. Swallow any framework
      // weirdness (e.g. tests without a real response object).
    }
    return next.handle().pipe(tap(() => undefined));
  }
}
