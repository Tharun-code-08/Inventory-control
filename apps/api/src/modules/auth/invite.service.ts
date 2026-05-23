import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { request } from 'undici';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, type LoginContext } from './auth.service';
import { InviteAcceptDto } from './dto/invite-accept.dto';

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private bcryptRounds() {
    const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
  }

  private turnstileSecret(): string | undefined {
    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY')?.trim();
    return secret || undefined;
  }

  private async verifyTurnstile(responseToken?: string) {
    const secret = this.turnstileSecret();
    if (!secret) return;
    if (!responseToken) {
      throw new BadRequestException('Captcha verification failed. Please try again.');
    }

    try {
      const { statusCode, body } = await request(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret, response: responseToken }).toString(),
        },
      );

      if (statusCode >= 500) {
        throw new ServiceUnavailableException('Captcha verification is unavailable. Try again.');
      }

      const payload = (await body.json()) as { success?: boolean; 'error-codes'?: string[] };
      if (!payload.success) {
        this.logger.warn(
          `Turnstile verification failed: ${JSON.stringify(payload['error-codes'] ?? [])}`,
        );
        throw new BadRequestException('Captcha verification failed. Please try again.');
      }
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      this.logger.error(`Turnstile verify error: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Captcha verification is unavailable. Try again.');
    }
  }

  private async findValidInvite(token: string) {
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const invite = await this.prisma.userInvitation.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        role: true,
        shop: { include: { company: true } },
        invitedBy: true,
      },
    });
    if (!invite) {
      throw new BadRequestException('Invalid or expired invitation link.');
    }
    return invite;
  }

  async preview(token: string) {
    const invite = await this.findValidInvite(token);
    return {
      email: invite.email,
      name: invite.name,
      roleName: invite.role.name,
      shopName: invite.shop?.shopName ?? null,
      companyName: invite.shop?.company?.companyName ?? null,
      inviterName: invite.invitedBy?.name ?? invite.invitedBy?.email ?? null,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async accept(dto: InviteAcceptDto, ctx: LoginContext) {
    const invite = await this.findValidInvite(dto.token);

    const existing = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists. Please sign in.');
    }

    await this.verifyTurnstile(dto.turnstileToken);

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: dto.name?.trim() || invite.name || invite.email.split('@')[0],
          email: invite.email,
          passwordHash,
          roleId: invite.roleId,
          shopId: invite.shopId ?? null,
          isActive: true,
          createdById: invite.invitedById,
        },
        include: { role: true, shop: true },
      });

      await tx.userInvitation.update({
        where: { id: invite.id },
        data: { consumedAt: new Date() },
      });

      return created;
    });

    return this.auth.issueSessionForUser(user.id, ctx);
  }
}
