import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_ENVELOPE_KEY } from '../decorators/skip-envelope.decorator';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }
    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload && typeof payload === 'object' && 'success' in (payload as object)) {
          return payload;
        }
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in (payload as object) &&
          'meta' in (payload as object)
        ) {
          const p = payload as { data: unknown; meta: unknown; message?: string };
          return { success: true, data: p.data, meta: p.meta, message: p.message };
        }
        return { success: true, data: payload };
      }),
    );
  }
}
