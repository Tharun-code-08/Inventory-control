import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordResetMethod } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { request } from 'undici';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, type LoginContext } from './auth.service';
import { CompletePasswordResetLinkDto } from './dto/complete-password-reset-link.dto';
import { CompletePasswordResetOtpDto } from './dto/complete-password-reset-otp.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';

const RESET_TTL_MINUTES = 10;
const RESET_MAX_ATTEMPTS = 5;
const RESET_REQUEST_COOLDOWN_SECONDS = 60;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly auth: AuthService,
  ) {}

  private normalizeEmail(email: string) {
    return email.toLowerCase().trim();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private bcryptRounds() {
    const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
  }

  private resetTtlMs() {
    return RESET_TTL_MINUTES * 60_000;
  }

  private requestCooldownMs() {
    return RESET_REQUEST_COOLDOWN_SECONDS * 1000;
  }

  private maxOtpAttempts() {
    return RESET_MAX_ATTEMPTS;
  }

  private generateOtp(): string {
    return String(randomInt(100_000, 1_000_000));
  }

  private genericRequestResponse(method: RequestPasswordResetDto['method']) {
    return {
      ok: true,
      method,
      message:
        method === 'otp'
          ? 'If an account exists, a reset code has been sent to the email address.'
          : 'If an account exists, a reset link has been sent to the email address.',
    };
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
          `Turnstile verification failed during password reset: ${JSON.stringify(payload['error-codes'] ?? [])}`,
        );
        throw new BadRequestException('Captcha verification failed. Please try again.');
      }
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      this.logger.error(`Turnstile verify error during password reset: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Captcha verification is unavailable. Try again.');
    }
  }

  private async applyPasswordReset(userId: string, email: string, requestId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new BadRequestException('Reset request is invalid or expired.');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds());
    const passwordChangedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.passwordResetRequest.updateMany({
        where: {
          id: requestId,
          userId,
          email,
          consumedAt: null,
          expiresAt: { gt: passwordChangedAt },
        },
        data: { consumedAt: passwordChangedAt },
      });
      if (current.count !== 1) {
        throw new BadRequestException('Reset request is invalid or expired.');
      }

      await tx.passwordResetRequest.updateMany({
        where: {
          email,
          consumedAt: null,
        },
        data: { consumedAt: passwordChangedAt },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: passwordChangedAt },
      });
    });
  }

  async requestReset(dto: RequestPasswordResetDto, ctx: LoginContext = {}) {
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'Password reset email is not configured. Contact support to reset your password.',
      );
    }

    const email = this.normalizeEmail(dto.email);
    const method =
      dto.method === 'magic_link' ? PasswordResetMethod.MAGIC_LINK : PasswordResetMethod.OTP;

    const recentPending = await this.prisma.passwordResetRequest.findFirst({
      where: {
        email,
        method,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (
      recentPending?.lastSentAt &&
      Date.now() - recentPending.lastSentAt.getTime() < this.requestCooldownMs()
    ) {
      return this.genericRequestResponse(dto.method);
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return this.genericRequestResponse(dto.method);
    }

    const expiresAt = new Date(Date.now() + this.resetTtlMs());
    const sentAt = new Date();
    const token = method === PasswordResetMethod.MAGIC_LINK ? randomBytes(32).toString('base64url') : null;
    const otp = method === PasswordResetMethod.OTP ? this.generateOtp() : null;
    const otpHash = otp ? await bcrypt.hash(otp, this.bcryptRounds()) : null;
    const linkTokenHash = token ? this.hashToken(token) : null;

    await this.prisma.passwordResetRequest.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: sentAt },
    });

    const reset = await this.prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        email,
        method,
        otpHash,
        linkTokenHash,
        expiresAt,
        lastSentAt: sentAt,
        requestedIp: ctx.ip ?? null,
        requestedUserAgent: ctx.userAgent?.slice(0, 512) ?? null,
      },
    });

    try {
      if (method === PasswordResetMethod.OTP && otp) {
        await this.mail.sendPasswordResetOtp({
          to: email,
          userName: user.name || email.split('@')[0],
          otpCode: otp,
          expiresMinutes: RESET_TTL_MINUTES,
        });
      } else if (method === PasswordResetMethod.MAGIC_LINK && token) {
        await this.mail.sendPasswordResetLink({
          to: email,
          userName: user.name || email.split('@')[0],
          token,
          expiresMinutes: RESET_TTL_MINUTES,
        });
      }
    } catch (err) {
      await this.prisma.passwordResetRequest.delete({ where: { id: reset.id } }).catch(() => undefined);
      this.logger.error(`Password reset delivery failed for ${email}: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Could not deliver the password reset email. Please try again in a few minutes.',
      );
    }

    return this.genericRequestResponse(dto.method);
  }

  async previewMagicLink(token: string) {
    const tokenHash = this.hashToken(token);
    const reset = await this.prisma.passwordResetRequest.findFirst({
      where: {
        method: PasswordResetMethod.MAGIC_LINK,
        linkTokenHash: tokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!reset || !reset.user?.isActive) {
      throw new BadRequestException('Reset link is invalid or expired.');
    }

    return {
      email: reset.email,
      expiresAt: reset.expiresAt.toISOString(),
    };
  }

  async completeMagicLink(dto: CompletePasswordResetLinkDto, ctx: LoginContext = {}) {
    await this.verifyTurnstile(dto.turnstileToken);

    const tokenHash = this.hashToken(dto.token);
    const reset = await this.prisma.passwordResetRequest.findFirst({
      where: {
        method: PasswordResetMethod.MAGIC_LINK,
        linkTokenHash: tokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset || !reset.user?.isActive) {
      throw new BadRequestException('Reset link is invalid or expired.');
    }

    await this.applyPasswordReset(reset.userId, reset.email, reset.id, dto.newPassword);
    return this.auth.issueSessionForUser(reset.userId, ctx);
  }

  async completeOtp(dto: CompletePasswordResetOtpDto, ctx: LoginContext = {}) {
    await this.verifyTurnstile(dto.turnstileToken);

    const email = this.normalizeEmail(dto.email);
    const reset = await this.prisma.passwordResetRequest.findFirst({
      where: {
        email,
        method: PasswordResetMethod.OTP,
        consumedAt: null,
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset || !reset.user?.isActive || !reset.otpHash) {
      throw new BadRequestException('Invalid or expired reset code.');
    }

    if (reset.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Reset code has expired. Request a new code.');
    }

    if (reset.attemptCount >= this.maxOtpAttempts()) {
      throw new BadRequestException('Too many attempts. Request a new reset code.');
    }

    const otpOk = await bcrypt.compare(dto.otp, reset.otpHash);
    if (!otpOk) {
      const reachedLimit = reset.attemptCount + 1 >= this.maxOtpAttempts();
      await this.prisma.passwordResetRequest.update({
        where: { id: reset.id },
        data: {
          attemptCount: { increment: 1 },
          consumedAt: reachedLimit ? new Date() : undefined,
        },
      });
      if (reachedLimit) {
        throw new BadRequestException('Too many attempts. Request a new reset code.');
      }
      throw new BadRequestException('Invalid or expired reset code.');
    }

    await this.applyPasswordReset(reset.userId, reset.email, reset.id, dto.newPassword);
    return this.auth.issueSessionForUser(reset.userId, ctx);
  }
}
