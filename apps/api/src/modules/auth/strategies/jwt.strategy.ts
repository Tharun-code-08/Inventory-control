import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RequestUser } from '../../../common/types/request-user';

type JwtPayload = { sub: string; pwd?: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, shop: { select: { companyId: true } } },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const currentPasswordVersion = user.passwordChangedAt?.toISOString() ?? null;
    const tokenPasswordVersion = typeof payload.pwd === 'string' ? payload.pwd : null;
    if (currentPasswordVersion !== tokenPasswordVersion) {
      throw new UnauthorizedException();
    }

    const companyId = user.shop?.companyId ?? null;
    let tenantShopIds: string[] = [];
    if (companyId) {
      const shops = await this.prisma.shop.findMany({
        where: { companyId },
        select: { id: true },
      });
      tenantShopIds = shops.map((shop) => shop.id);
      if (user.shopId && !tenantShopIds.includes(user.shopId)) {
        tenantShopIds.push(user.shopId);
      }
    } else if (user.shopId) {
      tenantShopIds = [user.shopId];
    }

    const permissions = user.role.permissions as unknown as string[];
    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      shopId: user.shopId,
      companyId,
      tenantShopIds,
      permissions,
    };
  }
}
