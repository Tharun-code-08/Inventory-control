import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

const READ_ONLY_BODY_KEYS = ['isOverride', 'definitions', 'sender'] as const;

/** Removes display-only keys from JSON bodies before ValidationPipe runs. */
@Injectable()
export class StripReadonlyBodyInterceptor implements NestInterceptor {
  constructor(private readonly keys: readonly string[] = READ_ONLY_BODY_KEYS) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.body && typeof request.body === 'object' && !Array.isArray(request.body)) {
      for (const key of this.keys) {
        delete (request.body as Record<string, unknown>)[key];
      }
    }
    return next.handle();
  }
}
