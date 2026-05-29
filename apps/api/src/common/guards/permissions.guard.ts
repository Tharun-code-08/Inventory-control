import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_ANY_KEY } from '../decorators/require-any-permission.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import type { RequestUser } from '../types/request-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredAny = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ANY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if ((!required || required.length === 0) && (!requiredAny || requiredAny.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (requiredAny?.length) {
      const allowed = requiredAny.some((perm) => user.permissions.includes(perm));
      if (!allowed) {
        throw new ForbiddenException('Missing permission');
      }
    } else if (required?.length) {
      for (const perm of required) {
        if (!user.permissions.includes(perm)) {
          throw new ForbiddenException('Missing permission');
        }
      }
    }

    const shopIdParam =
      request.params?.shopId ??
      request.params?.shop_id ??
      request.body?.shopId ??
      request.body?.shop_id ??
      request.query?.shop_id ??
      request.query?.shopId;

    if (
      (user.role === RoleName.SHOP_USER ||
        user.role === RoleName.WAREHOUSE_STAFF ||
        user.role === RoleName.EMPLOYEE ||
        user.role === RoleName.SALES ||
        user.role === RoleName.VIEWER ||
        user.role === RoleName.VENDOR) &&
      shopIdParam &&
      user.shopId &&
      shopIdParam !== user.shopId
    ) {
      throw new ForbiddenException('Shop scope mismatch');
    }
    return true;
  }
}
