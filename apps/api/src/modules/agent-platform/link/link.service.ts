import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AlertType,
  AuditAction,
  ChannelLinkStatus,
  ChatChannel,
  LinkTokenStatus,
  NotificationModule,
  NotificationPriority,
  Prisma,
  WhatsAppDeviceStatus,
  type UserChannelLink,
  type WhatsAppDevice,
} from '@prisma/client';
import { createHash, randomInt } from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '@/prisma/prisma.service';
import type { RequestUser } from '@/common/types/request-user';
import { REDIS_CLIENT } from '@/common/cache/redis.provider';
import { MailService } from '@/common/mail/mail.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/services/notification.service';

/** Unambiguous charset — no I/L/O/0/1 lookalikes; users type this by hand. */
const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TOKEN_LENGTH = 8;
const TOKEN_VERSION = 'V1';
const TOKEN_TTL_MS = 10 * 60_000;
const MAX_TOKENS_PER_HOUR = 5;
const MAX_ACTIVE_DEVICES = 5;
const AUTH_CACHE_TTL_S = 300;
const LAST_SEEN_THROTTLE_MS = 5 * 60_000;

export const waAuthCacheKey = (phoneNumber: string) => `wa:auth:${phoneNumber}`;

export type RedeemResult = { device: WhatsAppDevice; link: UserChannelLink };

@Injectable()
export class LinkService {
  private readonly logger = new Logger(LinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly notifications: NotificationService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Issue a short-lived, single-use link token from an authenticated IMS
   * session. The raw token is returned once (UI displays it with a countdown);
   * only its SHA-256 hash is persisted. Any previously ACTIVE token for this
   * user is expired — exactly one token can be outstanding at a time.
   */
  async generateLinkToken(user: RequestUser, ip?: string | null, userAgent?: string | null) {
    if (!user.companyId) {
      throw new BadRequestException('Your account has no company context; linking is unavailable');
    }

    const recentCount = await this.prisma.whatsAppLinkToken.count({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
    });
    if (recentCount >= MAX_TOKENS_PER_HOUR) {
      throw new HttpException(
        `Too many link codes requested. Maximum ${MAX_TOKENS_PER_HOUR} per hour — try again later.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.whatsAppLinkToken.updateMany({
        where: { userId: user.id, status: LinkTokenStatus.ACTIVE },
        data: { status: LinkTokenStatus.EXPIRED },
      }),
      this.prisma.whatsAppLinkToken.create({
        data: {
          userId: user.id,
          companyId: user.companyId,
          tokenHash,
          tokenVersion: TOKEN_VERSION,
          expiresAt,
          generatedIp: ip ?? null,
          generatedUserAgent: userAgent ?? null,
        },
      }),
    ]);

    await this.audit.logTenant(user, {
      action: AuditAction.LINK_TOKEN_GENERATED,
      entityType: 'WhatsAppLinkToken',
      ipAddress: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: { expiresAt: expiresAt.toISOString() },
    });

    return {
      token: rawToken,
      expiresAt,
      instructions: `Open WhatsApp and send "LINK ${rawToken}" to the business number within 10 minutes.`,
    };
  }

  /**
   * Webhook path: an unlinked number sent "LINK <token>". Validates and
   * consumes the token, creating (or reactivating) the trusted device and the
   * channel link in one serializable transaction so two concurrent redemptions
   * of the same token cannot both succeed. Returns null on any failure — the
   * caller stays silent so unknown numbers learn nothing.
   */
  async redeemLinkToken(phoneNumber: string, rawToken: string): Promise<RedeemResult | null> {
    const tokenHash = this.hashToken(this.canonicalizeToken(rawToken));
    const now = new Date();

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const token = await tx.whatsAppLinkToken.findUnique({ where: { tokenHash } });
          if (!token) return { rejected: 'unknown_token' as const };

          // Meta redelivers webhooks: a token already redeemed by this same
          // phone is a duplicate delivery, not an attack — succeed quietly.
          if (token.status === LinkTokenStatus.USED && token.linkedPhone === phoneNumber) {
            const device = await tx.whatsAppDevice.findUnique({ where: { phoneNumber } });
            const link = await tx.userChannelLink.findUnique({
              where: { channel_phoneNumber: { channel: ChatChannel.WHATSAPP, phoneNumber } },
            });
            return device && link && device.status === WhatsAppDeviceStatus.ACTIVE
              ? { device, link, duplicate: true }
              : { rejected: 'used_token' as const };
          }

          if (token.status !== LinkTokenStatus.ACTIVE) return { rejected: 'inactive_token' as const };
          if (token.expiresAt < now) {
            await tx.whatsAppLinkToken.update({
              where: { id: token.id },
              data: { status: LinkTokenStatus.EXPIRED },
            });
            return { rejected: 'expired_token' as const };
          }

          // Phone ownership: a number ACTIVE under another user must be
          // unlinked by its owner first — never silently transferred.
          const existingDevice = await tx.whatsAppDevice.findUnique({ where: { phoneNumber } });
          if (
            existingDevice &&
            existingDevice.status === WhatsAppDeviceStatus.ACTIVE &&
            existingDevice.userId !== token.userId
          ) {
            return { rejected: 'phone_owned_by_other' as const };
          }

          const activeCount = await tx.whatsAppDevice.count({
            where: { userId: token.userId, status: WhatsAppDeviceStatus.ACTIVE },
          });
          const isNewDevice = !existingDevice || existingDevice.status !== WhatsAppDeviceStatus.ACTIVE;
          if (isNewDevice && activeCount >= MAX_ACTIVE_DEVICES) {
            return { rejected: 'max_devices' as const };
          }

          await tx.whatsAppLinkToken.update({
            where: { id: token.id },
            data: { status: LinkTokenStatus.USED, usedAt: now, linkedPhone: phoneNumber },
          });

          const device = existingDevice
            ? await tx.whatsAppDevice.update({
                where: { id: existingDevice.id },
                data: {
                  userId: token.userId,
                  companyId: token.companyId,
                  status: WhatsAppDeviceStatus.ACTIVE,
                  linkedAt: now,
                  lastSeenAt: now,
                  revokedAt: null,
                  revokedById: null,
                },
              })
            : await tx.whatsAppDevice.create({
                data: {
                  userId: token.userId,
                  companyId: token.companyId,
                  phoneNumber,
                  lastSeenAt: now,
                },
              });

          const link = await tx.userChannelLink.upsert({
            where: { channel_phoneNumber: { channel: ChatChannel.WHATSAPP, phoneNumber } },
            create: {
              userId: token.userId,
              companyId: token.companyId,
              channel: ChatChannel.WHATSAPP,
              phoneNumber,
              status: ChannelLinkStatus.ACTIVE,
              verifiedAt: now,
              lastSeenAt: now,
            },
            update: {
              userId: token.userId,
              companyId: token.companyId,
              status: ChannelLinkStatus.ACTIVE,
              verifiedAt: now,
              lastSeenAt: now,
            },
          });

          return { device, link, token };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if ('rejected' in result) {
        await this.audit.log({
          action: AuditAction.DEVICE_REJECTED,
          entityType: 'WhatsAppDevice',
          metadata: { reason: result.rejected, phoneLast4: phoneNumber.slice(-4) },
        });
        this.logger.debug(`Link redemption rejected (${result.rejected}) for number ending ${phoneNumber.slice(-4)}`);
        return null;
      }

      const { device, link } = result;
      await this.redis.del(waAuthCacheKey(phoneNumber)).catch(() => undefined);

      if (!('duplicate' in result)) {
        await this.audit.log({
          companyId: device.companyId,
          userId: device.userId,
          action: AuditAction.DEVICE_LINKED,
          entityType: 'WhatsAppDevice',
          entityId: device.id,
          metadata: { phoneLast4: phoneNumber.slice(-4) },
        });
        await this.audit.log({
          companyId: device.companyId,
          userId: device.userId,
          action: AuditAction.LINK_TOKEN_USED,
          entityType: 'WhatsAppLinkToken',
          entityId: 'token' in result ? result.token.id : undefined,
        });
        // Fire-and-forget: the admin must learn about every new trusted device,
        // but notification failures must never fail the linking itself.
        void this.notifyDeviceLinked(device).catch((err: Error) =>
          this.logger.warn(`Device-linked notification failed: ${err.message}`),
        );
      }

      this.logger.log(`WhatsApp device linked for user ${device.userId}`);
      return { device, link };
    } catch (err) {
      // Serialization conflicts mean a concurrent redemption won the race.
      this.logger.warn(`Link redemption failed for number ending ${phoneNumber.slice(-4)}: ${(err as Error).message}`);
      return null;
    }
  }

  async listDevices(user: RequestUser) {
    const devices = await this.prisma.whatsAppDevice.findMany({
      where: { userId: user.id, status: { not: WhatsAppDeviceStatus.ARCHIVED } },
      orderBy: { linkedAt: 'desc' },
    });
    return devices.map((d) => ({
      id: d.id,
      phoneNumber: d.phoneNumber,
      nickname: d.nickname,
      deviceType: d.deviceType,
      status: d.status,
      linkedAt: d.linkedAt,
      lastSeenAt: d.lastSeenAt,
    }));
  }

  async renameDevice(user: RequestUser, deviceId: string, nickname: string) {
    const device = await this.prisma.whatsAppDevice.findFirst({
      where: { id: deviceId, userId: user.id },
    });
    if (!device) throw new NotFoundException('Device not found');
    return this.prisma.whatsAppDevice.update({
      where: { id: device.id },
      data: { nickname: nickname.trim().slice(0, 50) || null },
    });
  }

  /**
   * Revoke a trusted device. Soft: the row stays for history; the channel link
   * is revoked and the auth cache dropped so the very next message from that
   * number is rejected.
   */
  async revokeDevice(user: RequestUser, deviceId: string) {
    const device = await this.prisma.whatsAppDevice.findFirst({
      where: { id: deviceId, userId: user.id, status: WhatsAppDeviceStatus.ACTIVE },
    });
    if (!device) throw new NotFoundException('Active device not found');

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.whatsAppDevice.update({
        where: { id: device.id },
        data: { status: WhatsAppDeviceStatus.REVOKED, revokedAt: now, revokedById: user.id },
      }),
      this.prisma.userChannelLink.updateMany({
        where: {
          channel: ChatChannel.WHATSAPP,
          phoneNumber: device.phoneNumber,
          status: ChannelLinkStatus.ACTIVE,
        },
        data: { status: ChannelLinkStatus.REVOKED },
      }),
    ]);
    await this.redis.del(waAuthCacheKey(device.phoneNumber)).catch(() => undefined);

    await this.audit.logTenant(user, {
      action: AuditAction.DEVICE_REVOKED,
      entityType: 'WhatsAppDevice',
      entityId: device.id,
      metadata: { phoneLast4: device.phoneNumber.slice(-4) },
    });
    return { revoked: true };
  }

  async getStatus(user: RequestUser) {
    const link = await this.prisma.userChannelLink.findFirst({
      where: { userId: user.id, channel: ChatChannel.WHATSAPP },
      orderBy: { updatedAt: 'desc' },
    });
    if (!link) return { linked: false as const };
    return {
      linked: link.status === ChannelLinkStatus.ACTIVE,
      status: link.status,
      phoneNumber: link.phoneNumber,
      verifiedAt: link.verifiedAt,
      lastSeenAt: link.lastSeenAt,
    };
  }

  async unlink(user: RequestUser) {
    const links = await this.prisma.userChannelLink.findMany({
      where: { userId: user.id, channel: ChatChannel.WHATSAPP, status: ChannelLinkStatus.ACTIVE },
      select: { phoneNumber: true },
    });
    const now = new Date();
    const [result] = await this.prisma.$transaction([
      this.prisma.userChannelLink.updateMany({
        where: { userId: user.id, channel: ChatChannel.WHATSAPP, status: ChannelLinkStatus.ACTIVE },
        data: { status: ChannelLinkStatus.REVOKED },
      }),
      this.prisma.whatsAppDevice.updateMany({
        where: { userId: user.id, status: WhatsAppDeviceStatus.ACTIVE },
        data: { status: WhatsAppDeviceStatus.REVOKED, revokedAt: now, revokedById: user.id },
      }),
    ]);
    for (const { phoneNumber } of links) {
      await this.redis.del(waAuthCacheKey(phoneNumber)).catch(() => undefined);
    }
    return { revoked: result.count > 0 };
  }

  /**
   * Throttled activity tracking: at most one write per 5 minutes per device,
   * so a chatty conversation doesn't turn every message into two DB writes.
   */
  async touchLastSeen(link: UserChannelLink): Promise<void> {
    const stale =
      !link.lastSeenAt || Date.now() - link.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS;
    if (!stale) return;
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.userChannelLink.update({ where: { id: link.id }, data: { lastSeenAt: now } }),
      this.prisma.whatsAppDevice.updateMany({
        where: { phoneNumber: link.phoneNumber, status: WhatsAppDeviceStatus.ACTIVE },
        data: { lastSeenAt: now },
      }),
    ]);
  }

  /**
   * Rebuild the RequestUser context for a linked WhatsApp user — mirrors
   * JwtStrategy.validate (minus token/password checks, which don't apply to a
   * link proven by token possession). Cached in Redis for 5 minutes; the cache
   * is dropped on revoke and on role change (users module) so authorization
   * never lags a demotion by more than one lookup. Null when the account is
   * gone or deactivated: the caller must stop serving that number.
   */
  async buildRequestUser(link: UserChannelLink): Promise<RequestUser | null> {
    const cacheKey = waAuthCacheKey(link.phoneNumber);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as RequestUser;
    } catch {
      // Redis down = fall through to the DB; auth must not depend on cache.
    }

    const user = await this.prisma.user.findUnique({
      where: { id: link.userId },
      include: { role: true, shop: { select: { companyId: true } } },
    });
    if (!user || !user.isActive || user.deletedAt) return null;

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

    const requestUser: RequestUser = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      shopId: user.shopId,
      companyId,
      tenantShopIds,
      permissions: user.role.permissions as unknown as string[],
    };

    try {
      await this.redis.set(cacheKey, JSON.stringify(requestUser), 'EX', AUTH_CACHE_TTL_S);
    } catch {
      // Cache write failures are invisible to callers.
    }
    return requestUser;
  }

  /** Every 10 min (called by the cleanup scheduler): flip stale ACTIVE → EXPIRED. */
  async expireStaleTokens(): Promise<number> {
    const result = await this.prisma.whatsAppLinkToken.updateMany({
      where: { status: LinkTokenStatus.ACTIVE, expiresAt: { lt: new Date() } },
      data: { status: LinkTokenStatus.EXPIRED },
    });
    return result.count;
  }

  /** Daily: hard-delete consumed/expired tokens older than 30 days (audit rows remain). */
  async purgeOldTokens(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 3_600_000);
    const result = await this.prisma.whatsAppLinkToken.deleteMany({
      where: { status: { not: LinkTokenStatus.ACTIVE }, createdAt: { lt: cutoff } },
    });
    return result.count;
  }

  private async notifyDeviceLinked(device: WhatsAppDevice): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: device.userId },
      select: { email: true, name: true },
    });
    if (!user) return;

    const masked = `+${device.phoneNumber.slice(0, -4).replace(/\d/g, 'X')}${device.phoneNumber.slice(-4)}`;
    const when = device.linkedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    await this.notifications.create(
      {
        userId: device.userId,
        title: 'New WhatsApp device linked',
        message: `WhatsApp number ${masked} is now linked to your account and can use the AI assistant.`,
        type: AlertType.NEW_DEVICE_LOGIN,
        priority: NotificationPriority.HIGH,
        module: NotificationModule.SECURITY,
        referenceType: 'WhatsAppDevice',
        referenceId: device.id,
      },
      null,
      device.companyId,
    );

    await this.mail.sendPlatformMail({
      to: user.email,
      subject: 'New WhatsApp device linked to your account',
      text:
        `Hi ${user.name ?? ''},\n\nA new WhatsApp device was linked to your account.\n\n` +
        `Phone: ${masked}\nTime: ${when}\n\n` +
        `If this wasn't you, remove the device immediately from Settings → WhatsApp AI.`,
      html:
        `<p>Hi ${user.name ?? ''},</p><p>A new WhatsApp device was linked to your account.</p>` +
        `<p><strong>Phone:</strong> ${masked}<br/><strong>Time:</strong> ${when}</p>` +
        `<p>If this wasn't you, remove the device immediately from <strong>Settings → WhatsApp AI</strong>.</p>`,
    });
  }

  /** "V1-ABCD2345" — versioned so a future format change stays redeemable. */
  private generateToken(): string {
    let body = '';
    for (let i = 0; i < TOKEN_LENGTH; i += 1) {
      body += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)];
    }
    return `${TOKEN_VERSION}-${body}`;
  }

  /** Accepts "V1-XXXXXXXX" or bare "XXXXXXXX" (users drop the prefix). */
  canonicalizeToken(raw: string): string {
    const upper = raw.trim().toUpperCase();
    return upper.startsWith(`${TOKEN_VERSION}-`) ? upper : `${TOKEN_VERSION}-${upper}`;
  }

  private hashToken(canonicalToken: string): string {
    return createHash('sha256').update(canonicalToken).digest('hex');
  }
}
