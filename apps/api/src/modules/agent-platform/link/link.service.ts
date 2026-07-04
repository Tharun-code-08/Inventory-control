import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelLinkStatus, ChatChannel, type UserChannelLink } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import type { RequestUser } from '@/common/types/request-user';

const OTP_REGEX = /\b(\d{6})\b/;

@Injectable()
export class LinkService {
  private readonly logger = new Logger(LinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Issue a linking code for the caller's WhatsApp number. Proof of possession
   * is the code arriving FROM that number via the webhook, so the code can be
   * returned in the API response instead of being delivered out-of-band.
   */
  async requestLink(user: RequestUser, rawPhoneNumber: string) {
    if (!user.companyId) {
      throw new BadRequestException('Your account has no company context; linking is unavailable');
    }
    const phoneNumber = this.normalizePhone(rawPhoneNumber);

    const existing = await this.prisma.userChannelLink.findUnique({
      where: { channel_phoneNumber: { channel: ChatChannel.WHATSAPP, phoneNumber } },
    });
    if (existing && existing.status === ChannelLinkStatus.ACTIVE && existing.userId !== user.id) {
      throw new ConflictException('This WhatsApp number is already linked to another account');
    }

    const code = this.generateOtp();
    const otpHash = await bcrypt.hash(code, this.bcryptRounds());
    const expiresAt = new Date(Date.now() + this.otpTtlMs());

    await this.prisma.$transaction([
      this.prisma.whatsAppVerification.deleteMany({
        where: { userId: user.id, consumedAt: null },
      }),
      this.prisma.whatsAppVerification.create({
        data: { userId: user.id, companyId: user.companyId, phoneNumber, otpHash, expiresAt },
      }),
    ]);

    return {
      phoneNumber,
      code,
      expiresAt,
      instructions: `Send the code ${code} as a WhatsApp message from +${phoneNumber} to the platform number to finish linking.`,
    };
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
    const result = await this.prisma.userChannelLink.updateMany({
      where: { userId: user.id, channel: ChatChannel.WHATSAPP, status: ChannelLinkStatus.ACTIVE },
      data: { status: ChannelLinkStatus.REVOKED },
    });
    return { revoked: result.count > 0 };
  }

  /**
   * Webhook path: an unlinked number sent us text. If it contains a valid,
   * unexpired code issued for that number, consume it and activate the link.
   * Returns the ACTIVE link on success, null otherwise (caller stays silent —
   * unknown numbers must not learn whether a code/account exists).
   */
  async verifyInboundCode(phoneNumber: string, text: string): Promise<UserChannelLink | null> {
    const match = OTP_REGEX.exec(text);
    if (!match) return null;

    const verification = await this.prisma.whatsAppVerification.findFirst({
      where: {
        phoneNumber,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attemptCount: { lt: this.maxOtpAttempts() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification) return null;

    const ok = await bcrypt.compare(match[1], verification.otpHash);
    if (!ok) {
      await this.prisma.whatsAppVerification.update({
        where: { id: verification.id },
        data: { attemptCount: { increment: 1 } },
      });
      return null;
    }

    const now = new Date();
    const [, link] = await this.prisma.$transaction([
      this.prisma.whatsAppVerification.update({
        where: { id: verification.id },
        data: { consumedAt: now },
      }),
      this.prisma.userChannelLink.upsert({
        where: { channel_phoneNumber: { channel: ChatChannel.WHATSAPP, phoneNumber } },
        create: {
          userId: verification.userId,
          companyId: verification.companyId,
          channel: ChatChannel.WHATSAPP,
          phoneNumber,
          status: ChannelLinkStatus.ACTIVE,
          verifiedAt: now,
          lastSeenAt: now,
        },
        update: {
          userId: verification.userId,
          companyId: verification.companyId,
          status: ChannelLinkStatus.ACTIVE,
          verifiedAt: now,
          lastSeenAt: now,
        },
      }),
    ]);
    this.logger.log(`WhatsApp link activated for user ${verification.userId}`);
    return link;
  }

  /**
   * Rebuild the RequestUser context for a linked WhatsApp user — mirrors
   * JwtStrategy.validate (minus token/password checks, which don't apply to
   * a link that was proven by OTP possession). Null when the account is gone
   * or deactivated: the caller must stop serving that number.
   */
  async buildRequestUser(link: UserChannelLink): Promise<RequestUser | null> {
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

    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      shopId: user.shopId,
      companyId,
      tenantShopIds,
      permissions: user.role.permissions as unknown as string[],
    };
  }

  normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      throw new BadRequestException('phoneNumber must contain 8-15 digits');
    }
    return digits;
  }

  private generateOtp(): string {
    return String(randomInt(100_000, 1_000_000));
  }

  private otpTtlMs(): number {
    const minutes = Number(this.config.get('SIGNUP_OTP_TTL_MIN') ?? 15);
    return Math.max(5, minutes) * 60_000;
  }

  private maxOtpAttempts(): number {
    return Number(this.config.get('SIGNUP_OTP_MAX_ATTEMPTS') ?? 5);
  }

  private bcryptRounds(): number {
    const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
  }
}
