import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestUser } from '../../common/types/request-user';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = req.user;
    if (!user?.email) {
      throw new ForbiddenException('Platform admin access required');
    }

    const allowlist = this.parseAllowlist();
    if (allowlist.size === 0) {
      throw new ForbiddenException('Platform admin allowlist is not configured (PLATFORM_ADMIN_EMAILS)');
    }

    if (!allowlist.has(user.email.toLowerCase())) {
      throw new ForbiddenException('Platform admin access required');
    }

    return true;
  }

  private parseAllowlist(): Set<string> {
    const raw =
      this.config.get<string>('PLATFORM_ADMIN_EMAILS') ??
      process.env.PLATFORM_ADMIN_EMAILS ??
      '';
    return new Set(
      raw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );
  }
}
