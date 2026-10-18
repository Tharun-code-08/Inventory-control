import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleName } from '@prisma/client';
import type { RequestUser } from '../types/request-user';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role-based authorization guard. Reads the roles declared by {@link Roles} on
 * the handler (or class) and allows the request only when the authenticated
 * user holds one of them. Handlers without @Roles are allowed through — pair
 * this with JwtAuthGuard so unrestricted routes are still authenticated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest<{ user?: RequestUser }>().user;
    if (!user?.role || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}
