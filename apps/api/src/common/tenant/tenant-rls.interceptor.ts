import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context';
import type { RequestUser } from '../types/request-user';

@Injectable()
export class TenantRlsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const companyId = req.user?.companyId ?? null;

    return new Observable((subscriber) => {
      TenantContext.run({ companyId, inRLSTx: false }, () => {
        next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
