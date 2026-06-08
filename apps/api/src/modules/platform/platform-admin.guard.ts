import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestUser } from '../../common/types/request-user';
import {
  isPlatformAdminEmail,
  parsePlatformAdminEmailsFromConfig,
} from './platform-admin.util';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = req.user;
    if (!user?.email) {
      throw new ForbiddenException(
        'Platform admin access required. Set PLATFORM_ADMIN_EMAILS on the server and sign in with an allowlisted account.',
      );
    }

    const allowlist = parsePlatformAdminEmailsFromConfig(this.config);
    if (allowlist.size === 0) {
      throw new ForbiddenException(
        'Platform admin allowlist is not configured (PLATFORM_ADMIN_EMAILS)',
      );
    }

    if (!isPlatformAdminEmail(user.email, allowlist)) {
      throw new ForbiddenException(
        'Platform admin access required. Set PLATFORM_ADMIN_EMAILS on the server and sign in with an allowlisted account.',
      );
    }

    return true;
  }
}
