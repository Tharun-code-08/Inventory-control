import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvatarStorageService } from '../../common/upload/avatar-storage.service';
import { AuditService } from '../audit/audit.service';
import { AttemptSource } from '../../common/enums/attempt-source.enum';
import { AuditReason } from '../../common/enums/audit-reason.enum';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import {
  isPlatformAdminEmail,
  parsePlatformAdminEmailsFromConfig,
} from '../platform/platform-admin.util';

type RefreshPayload = { sub: string; sid: string; refreshId: string };
type AccessPayload = { sub: string; email: string; role: string; pwd?: string };
type SessionUserRecord = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  shopId: string | null;
  passwordChangedAt?: Date | null;
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
    companyId: string | null;
  } | null;
};

type LoginUserRecord = SessionUserRecord & {
  passwordHash: string;
  isActive: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
  mfaEnabled: boolean;
};

export type LoginContext = {
  ip?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  requestId?: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly avatarStorage: AvatarStorageService,
    private readonly audit: AuditService,
  ) {}

  private bcryptRounds() {
    const value = Number(this.config.get<string | number>('BCRYPT_ROUNDS') ?? 12);
    return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
  }

  private lockoutThreshold() {
    return Number(this.config.get<string | number>('LOCKOUT_THRESHOLD') ?? 5);
  }

  private lockoutDurationMs() {
    return Number(this.config.get<string | number>('LOCKOUT_DURATION_MIN') ?? 15) * 60 * 1000;
  }

  /**
   * Progressive lockout windows reduce brute-force throughput across repeated
   * lock cycles. The first lock uses base duration; subsequent lock cycles
   * double up to an upper bound.
   */
  private lockoutUntilForFailures(nextFailedCount: number): Date {
    const threshold = this.lockoutThreshold();
    const severity = Math.max(1, nextFailedCount - threshold + 1);
    const multiplier = Math.min(8, 2 ** (severity - 1));
    return new Date(Date.now() + this.lockoutDurationMs() * multiplier);
  }

  private toSessionUser(user: SessionUserRecord) {
    const permissions = user.role.permissions as unknown as string[];
    const allowlist = parsePlatformAdminEmailsFromConfig(this.config);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      shopId: user.shopId,
      companyId: user.shop?.companyId ?? null,
      permissions,
      isPlatformAdmin: isPlatformAdminEmail(user.email, allowlist),
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
            companyId: user.shop.companyId,
          }
        : null,
    };
  }

  private refreshTtl() {
    return this.config.get<string>('JWT_REFRESH_EXPIRES', '7d') as
      | `${number}m`
      | `${number}d`
      | `${number}h`;
  }

  private refreshTtlMs(): number {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES', '7d');
    const match = /^(\d+)([mhd])$/.exec(raw.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const [, n, unit] = match;
    const ms = unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return Number(n) * ms;
  }

  private passwordVersion(passwordChangedAt?: Date | null): string | undefined {
    return passwordChangedAt ? passwordChangedAt.toISOString() : undefined;
  }

  private async signAccessToken(args: {
    userId: string;
    email: string;
    roleName: string;
    passwordChangedAt?: Date | null;
  }) {
    const payload: AccessPayload = {
      sub: args.userId,
      email: args.email,
      role: args.roleName,
    };
    const pwd = this.passwordVersion(args.passwordChangedAt);
    if (pwd) payload.pwd = pwd;
    return this.jwt.signAsync(payload);
  }

  /**
   * Mint a new session row + signed refresh token. The refreshId is the
   * unguessable secret stored as a bcrypt hash on the row; the row id is
   * embedded in the JWT so we can find the matching session in O(1) and
   * compare-and-swap on it during rotation.
   */
  private async issueSession(userId: string, ctx: LoginContext) {
    const refreshId = randomUUID();
    const refreshHash = await bcrypt.hash(refreshId, this.bcryptRounds());
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshHash,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent?.slice(0, 512) ?? null,
        expiresAt: new Date(Date.now() + this.refreshTtlMs()),
      },
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, sid: session.id, refreshId } satisfies RefreshPayload,
      {
        secret: this.config.getOrThrow<string>('REFRESH_SECRET'),
        expiresIn: this.refreshTtl(),
      },
    );
    return { sessionId: session.id, refreshToken };
  }

  async validateCredentials(
    dto: LoginDto,
    ctx: LoginContext = {},
  ): Promise<LoginUserRecord> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, shop: true },
    });
    // Generic message — don't leak whether the email exists or whether the
    // account is locked. Ops can still see lock state in logs/admin.
    const generic = 'Invalid credentials or account temporarily locked';
    if (!user || !user.isActive) {
      // Cannot audit user not found (no userId or companyId available)
      this.logger.log(
        JSON.stringify({
          requestId: ctx.requestId,
          event: 'LOGIN_FAILED',
          reason: 'USER_NOT_FOUND',
          email,
        }),
      );
      throw new UnauthorizedException(generic);
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      // Log failed login with user identified but account locked
      const companyId = user.shop?.companyId;
      if (companyId) {
        await this.audit.log({
          companyId,
          userId: user.id,
          action: AuditAction.LOGIN_FAILED,
          reason: AuditReason.ACCOUNT_LOCKED,
          ipAddress: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
          metadata: {
            email,
            attemptSource: AttemptSource.MOBILE,
          },
          requestId: ctx.requestId,
        });
      }
      this.logger.log(
        JSON.stringify({
          requestId: ctx.requestId,
          event: 'LOGIN_FAILED',
          reason: 'ACCOUNT_LOCKED',
          userId: user.id,
        }),
      );
      throw new UnauthorizedException(generic);
    }

    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    } catch (err) {
      this.logger.warn(
        `bcrypt.compare failed for userId=${user.id}: ${(err as Error)?.message ?? 'unknown'}`,
      );
      passwordOk = false;
    }
    if (!passwordOk) {
      // Use the persisted post-increment counter inside one transaction so
      // lockout escalation reflects true concurrent failure volume.
      const threshold = this.lockoutThreshold();
      await this.prisma.$transaction(async (tx) => {
        const afterIncrement = await tx.user.update({
          where: { id: user.id },
          data: { failedLoginCount: { increment: 1 } },
          select: { failedLoginCount: true },
        });
        if (afterIncrement.failedLoginCount >= threshold) {
          await tx.user.update({
            where: { id: user.id },
            data: {
              lockedUntil: this.lockoutUntilForFailures(afterIncrement.failedLoginCount),
            },
          });
        }
      });
      // Log failed login with user identified but invalid password
      const companyId = user.shop?.companyId;
      if (companyId) {
        await this.audit.log({
          companyId,
          userId: user.id,
          action: AuditAction.LOGIN_FAILED,
          reason: AuditReason.INVALID_PASSWORD,
          ipAddress: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
          metadata: {
            email,
            attemptSource: AttemptSource.MOBILE,
          },
          requestId: ctx.requestId,
        });
      }
      this.logger.log(
        JSON.stringify({
          requestId: ctx.requestId,
          event: 'LOGIN_FAILED',
          reason: 'INVALID_PASSWORD',
          userId: user.id,
        }),
      );
      throw new UnauthorizedException(generic);
    }

    // Reset lockout state on success.
    if (user.failedLoginCount > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    return user as LoginUserRecord;
  }

  async lockAccountForMfa(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginCount: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }
    const nextFailedCount = Math.max(user.failedLoginCount, this.lockoutThreshold());
    const lockedUntil = this.lockoutUntilForFailures(nextFailedCount);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: nextFailedCount,
        lockedUntil,
      },
    });
    return lockedUntil;
  }

  async login(dto: LoginDto, ctx: LoginContext = {}) {
    const user = await this.validateCredentials(dto, ctx);
    return this.issueSessionForUser(user.id, ctx);
  }

  async refreshFromToken(refreshToken: string | undefined, ctx: LoginContext = {}) {
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

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.userId !== payload.sub || session.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const matches = await bcrypt.compare(payload.refreshId, session.refreshHash);
    if (!matches) {
      // Bad refreshId on a valid session id → likely replay. Revoke ALL active
      // sessions for this user so an attacker who stole one cookie can't keep
      // refreshing.
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { role: true, shop: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Issue the new secret BEFORE rotating, then atomic compare-and-swap on the
    // OLD hash. Replays of the old cookie observe count=0 and are rejected.
    const newRefreshId = randomUUID();
    const newRefreshHash = await bcrypt.hash(newRefreshId, this.bcryptRounds());
    const rotated = await this.prisma.session.updateMany({
      where: { id: session.id, refreshHash: session.refreshHash, revokedAt: null },
      data: {
        refreshHash: newRefreshHash,
        lastSeenAt: new Date(),
        ip: ctx.ip ?? session.ip,
        userAgent: ctx.userAgent?.slice(0, 512) ?? session.userAgent,
      },
    });
    if (rotated.count === 0) {
      // Lost the race or someone else already rotated. Either way, revoke and
      // force a new login — never re-use a refreshId.
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token already used');
    }

    const accessToken = await this.signAccessToken({
      userId: user.id,
      email: user.email,
      roleName: String(user.role.name),
      passwordChangedAt: user.passwordChangedAt,
    });
    const newRefreshToken = await this.jwt.signAsync(
      { sub: user.id, sid: session.id, refreshId: newRefreshId } satisfies RefreshPayload,
      {
        secret: this.config.getOrThrow<string>('REFRESH_SECRET'),
        expiresIn: this.refreshTtl(),
      },
    );

    return {
      accessToken,
      refreshCookieValue: newRefreshToken,
      sessionId: session.id,
      user: this.toSessionUser(user as SessionUserRecord),
    };
  }

  async getSessionIdFromRefreshToken(refreshToken: string | undefined): Promise<string | null> {
    if (!refreshToken) return null;
    try {
      const payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('REFRESH_SECRET'),
      });
      return payload.sid ?? null;
    } catch {
      return null;
    }
  }

  async logout(userId: string, sessionId?: string | null) {
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }
    // Fallback for callers without a session id (e.g. legacy tokens).
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listSessions(userId: string) {
    const rows = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
      },
    });
    return rows;
  }

  async revokeSession(userId: string, sessionId: string, isAdmin: boolean) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Cannot revoke another user session');
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async revokeAllForUser(userId: string) {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: result.count };
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
    const nextAvatarUrl = avatar ? await this.avatarStorage.store(userId, avatar) : undefined;

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
    await this.forceResetPassword(userId, dto.newPassword);
    return { ok: true };
  }

  async forceResetPassword(userId: string, nextPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }
    const newHash = await bcrypt.hash(nextPassword, this.bcryptRounds());
    const passwordChangedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newHash,
          passwordChangedAt,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      // Revoke every active session so prior cookies cannot be replayed.
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: passwordChangedAt },
      }),
      this.prisma.trustedMfaDevice.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: passwordChangedAt },
      }),
    ]);
    return { ok: true, passwordChangedAt };
  }

  /** Issue tokens after signup verification (same shape as login). */
  async issueSessionForUser(userId: string, ctx: LoginContext = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, shop: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    const accessToken = await this.signAccessToken({
      userId: user.id,
      email: user.email,
      roleName: String(user.role.name),
      passwordChangedAt: user.passwordChangedAt,
    });

    // Create session and log LOGIN in same transaction
    const companyId = user.shop?.companyId;
    if (!companyId) {
      throw new UnauthorizedException('User shop or company not properly configured');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const session = await this.issueSession(user.id, ctx);

      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
      });

      // Log successful login in same transaction
      await this.audit.log(
        {
          companyId,
          userId: user.id,
          action: AuditAction.LOGIN,
          ipAddress: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
          deviceId: ctx.deviceId ?? null,
          metadata: {
            attemptSource: AttemptSource.MOBILE,
          },
          requestId: ctx.requestId,
        },
        tx,
      );

      return session;
    });

    this.logger.log(
      JSON.stringify({
        requestId: ctx.requestId,
        event: 'LOGIN_SUCCESS',
        userId: user.id,
        companyId: user.shop?.companyId,
      }),
    );

    return {
      accessToken,
      refreshCookieValue: result.refreshToken,
      sessionId: result.sessionId,
      user: this.toSessionUser(user as SessionUserRecord),
    };
  }
}
