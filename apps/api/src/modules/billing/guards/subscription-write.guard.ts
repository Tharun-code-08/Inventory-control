import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestUser } from '@/common/types/request-user';
import { SubscriptionService } from '../subscription.service';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Routes that stay writable on an expired plan: signing in/out, paying,
 * personal settings and notifications, and taking data out (backups, exports,
 * PDFs).
 */
const ALWAYS_WRITABLE = [
  '/api/v1/auth',
  '/api/v1/billing',
  '/api/v1/platform',
  '/api/v1/notifications',
  '/api/v1/devices',
  '/api/v1/users/me',
  '/api/v1/backups',
  '/api/v1/export',
  '/api/v1/pdf',
];

/**
 * An expired subscription (after the grace period) makes the organisation
 * read-only: users can sign in and view everything, but creating or changing
 * documents is refused until they renew. Unauthenticated/public routes and
 * platform-wide users are not affected.
 */
@Injectable()
export class SubscriptionWriteGuard implements CanActivate {
  constructor(private readonly subscriptions: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    if (process.env.SUBSCRIPTION_READ_ONLY_ENFORCED === 'false') return true;
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    if (READ_METHODS.has(req.method)) return true;
    const companyId = req.user?.companyId;
    if (!companyId) return true;
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (ALWAYS_WRITABLE.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return true;

    const reason = await this.subscriptions.writeBlockReason(companyId);
    if (reason) {
      throw new ForbiddenException({ code: 'SUBSCRIPTION_READ_ONLY', message: reason });
    }
    return true;
  }
}
