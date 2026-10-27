import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context';
import { RequestContextStore } from '../context/request-context';
import type { RequestUser } from '../types/request-user';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantRlsInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const companyId = req.user?.companyId ?? null;
    const systemAccess =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    // Auth has resolved by now: expose the actor to audit/outbox writes made
    // during the request (the middleware only knows it at response finish).
    if (req.user) RequestContextStore.patch({ userId: req.user.id, shopId: req.user.shopId ?? null });

    return new Observable((subscriber) => {
      TenantContext.run({ companyId, inRLSTx: false, systemAccess }, () => {
        next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
