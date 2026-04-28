import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

type RefreshPayload = { sub: string; refreshId: string };
type SessionUserRecord = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  shopId: string | null;
  role: {
    name: string;
    permissions: unknown;
  };
  shop: {
    id: string;
    shopNumber: string;
    shopName: string;
    address: string;
    contactPerson: string;
    mobile: string;
    email: string;
    isActive: boolean;
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private toSessionUser(user: SessionUserRecord) {
    const permissions = user.role.permissions as unknown as string[];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      shopId: user.shopId,
      permissions,
      avatarUrl: user.avatarUrl,
      shop: user.shop
        ? {
            id: user.shop.id,
            shopNumber: user.shop.shopNumber,
            shopName: user.shop.shopName,
            address: user.shop.address,
            contactPerson: user.shop.contactPerson,
            mobile: user.shop.mobile,
            email: user.shop.email,
            isActive: user.shop.isActive,
          }
        : null,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { role: true, shop: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    } catch {
      passwordOk = false;
    }
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: String(user.role.name),
    });

    const refreshId = randomUUID();
    const refreshTokenHash = await bcrypt.hash(refreshId, 10);
    const refreshTtl = this.config.get<string>('JWT_REFRESH_EXPIRES', '7d');
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, refreshId } satisfies RefreshPayload,
      {
        secret: this.config.getOrThrow<string>('REFRESH_SECRET'),
        expiresIn: refreshTtl as `${number}m` | `${number}d` | `${number}h`,
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, lastLoginAt: new Date() },
    });
    return {
      accessToken,
      refreshCookieValue: refreshToken,
      user: this.toSessionUser(user as SessionUserRecord),
    };
  }

  async refreshFromToken(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, shop: true },
    });
    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const matches = await bcrypt.compare(payload.refreshId, user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newRefreshId = randomUUID();
    const newHash = await bcrypt.hash(newRefreshId, 10);
    const newRefreshToken = await this.jwt.signAsync(
      { sub: user.id, refreshId: newRefreshId } satisfies RefreshPayload,
      {
        secret: this.config.getOrThrow<string>('REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES', '7d') as `${number}m` | `${number}d` | `${number}h`,
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newHash },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: String(user.role.name),
    });

    return {
      accessToken,
      refreshCookieValue: newRefreshToken,
      user: this.toSessionUser(user as SessionUserRecord),
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, shop: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return this.toSessionUser(user as SessionUserRecord);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, avatar?: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, shop: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const nextName = dto.name?.trim() || undefined;
    const nextShopName = dto.shopName?.trim() || undefined;
    const nextAvatarUrl = avatar ? `/uploads/avatars/${userId}-${Date.now()}.${(avatar.originalname.split('.').pop() || 'png').toLowerCase()}` : undefined;

    const hasChange = !!(nextName || nextShopName || avatar);
    if (!hasChange) {
      return this.me(userId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const userData: Record<string, unknown> = {};
      if (nextName) userData.name = nextName;
      if (nextAvatarUrl) userData.avatarUrl = nextAvatarUrl;
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }

      if (nextShopName && user.shopId) {
        await tx.shop.update({
          where: { id: user.shopId },
          data: { shopName: nextShopName, updatedById: userId },
        });
      }

      return tx.user.findUnique({
        where: { id: userId },
        include: { role: true, shop: true },
      });
    });

    if (!updated) {
      throw new UnauthorizedException();
    }

    return this.toSessionUser(updated as SessionUserRecord);
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, refreshTokenHash: null },
    });
    return { ok: true };
  }
}
