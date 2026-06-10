import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthChallengePurpose, MfaMethod } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, type LoginContext } from './auth.service';
import { MfaEnrollVerifyDto } from './dto/mfa-enroll-verify.dto';
import { MfaLoginVerifyDto } from './dto/mfa-login-verify.dto';
import { MfaSettingsVerifyDto } from './dto/mfa-settings-verify.dto';
import type { SignupPendingPayload } from './signup.service';

type ChallengeRecord = Awaited<ReturnType<MfaService['findValidChallenge']>>;
type SignupSessionRecord = Awaited<ReturnType<MfaService['findValidSignupSession']>>;

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  private bcryptRounds() {
    const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
  }

  private challengeTtlMs() {
    const minutes = Number(this.config.get('MFA_CHALLENGE_TTL_MIN') ?? 15);
    return Math.max(5, minutes) * 60_000;
  }

  private loginMaxAttempts() {
    return Number(this.config.get('MFA_LOGIN_MAX_ATTEMPTS') ?? 5);
  }

  private backupCodeCount() {
    return Number(this.config.get('MFA_BACKUP_CODE_COUNT') ?? 8);
  }

  private trustedDeviceTtlMs() {
    const days = Number(this.config.get('MFA_TRUSTED_DEVICE_DAYS') ?? 7);
    return Math.max(1, days) * 24 * 60 * 60 * 1000;
  }

  private signupSessionTtlMs() {
    return 60 * 60 * 1000;
  }

  private attemptsRemaining(attemptCount: number) {
    return Math.max(0, this.loginMaxAttempts() - attemptCount);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private encryptionKey() {
    const explicit = this.config.get<string>('MFA_SECRET_ENCRYPTION_KEY')?.trim();
    const seed =
      explicit ||
      `${this.config.get<string>('JWT_SECRET') ?? ''}:${this.config.get<string>('REFRESH_SECRET') ?? ''}:retail-ims-mfa`;
    return createHash('sha256').update(seed).digest();
  }

  private encryptSecret(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  private decryptSecret(payload: string) {
    const [ivRaw, tagRaw, encryptedRaw] = payload.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) {
      throw new UnauthorizedException('Stored MFA secret is invalid');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      Buffer.from(ivRaw, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private normalizeBackupCode(code: string) {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private generateBackupCodes() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const nextChunk = () =>
      Array.from(randomBytes(4), (byte) => alphabet[byte % alphabet.length]).join('');
    return Array.from({ length: this.backupCodeCount() }, () => `${nextChunk()}-${nextChunk()}`);
  }

  private async consumePreviousChallenges(userId: string, purpose: AuthChallengePurpose) {
    await this.prisma.authChallenge.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }

  private async createChallenge(userId: string, purpose: AuthChallengePurpose, ctx: LoginContext) {
    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.challengeTtlMs());
    const challenge = await this.prisma.authChallenge.create({
      data: {
        userId,
        purpose,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
        requestedIp: ctx.ip ?? null,
        requestedUserAgent: ctx.userAgent?.slice(0, 512) ?? null,
      },
    });
    return { rawToken, challenge };
  }

  private async findValidChallenge(token: string, purpose: AuthChallengePurpose) {
    const challenge = await this.prisma.authChallenge.findFirst({
      where: {
        purpose,
        tokenHash: this.hashToken(token),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge || !challenge.user?.isActive) {
      throw new BadRequestException('MFA challenge is invalid or expired.');
    }
    return challenge;
  }

  private async findValidSignupSession(token: string) {
    const pending = await this.prisma.signupVerification.findFirst({
      where: {
        sessionTokenHash: this.hashToken(token),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) {
      throw new BadRequestException('MFA setup session is invalid or expired.');
    }
    const payload = pending.payload as SignupPendingPayload;
    if (!payload.otpVerifiedAt) {
      throw new BadRequestException('Email verification must be completed before MFA setup.');
    }
    return { pending, payload };
  }

  private async findActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        mfaEnabled: true,
        mfaMethod: true,
        mfaEnrolledAt: true,
        mfaSecretEncrypted: true,
      },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  private async buildTotpSetup(args: {
    email: string;
    secret: string;
    expiresAt: Date;
    attemptCount: number;
    logContext: string;
  }) {
    const otpAuthUrl = generateURI({
      issuer: 'SoftdigitIMS',
      label: args.email,
      secret: args.secret,
      period: 30,
    });
    let qrCodeDataUrl: string | null = null;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
        width: 240,
        margin: 1,
      });
    } catch (error) {
      this.logger.warn(
        `QR code generation failed for ${args.logContext} (${args.email}): ${(error as Error).message}`,
      );
    }

    return {
      email: args.email,
      manualCode: args.secret,
      qrCodeDataUrl,
      otpAuthUrl,
      attemptsRemaining: this.attemptsRemaining(args.attemptCount),
      expiresAt: args.expiresAt.toISOString(),
    };
  }

  private isValidTotp(secret: string, code: string) {
    const verification = verifySync({
      secret,
      token: code,
      period: 30,
      epochTolerance: 30,
    });
    return verification.valid;
  }

  private async generateHashedBackupCodes() {
    const backupCodes = this.generateBackupCodes();
    const backupCodeHashes = await Promise.all(
      backupCodes.map((code) =>
        bcrypt.hash(this.normalizeBackupCode(code), this.bcryptRounds()),
      ),
    );
    return { backupCodes, backupCodeHashes };
  }

  private async failChallenge(challenge: ChallengeRecord) {
    const nextCount = challenge.attemptCount + 1;
    const remainingAttempts = this.attemptsRemaining(nextCount);
    await this.prisma.authChallenge.update({
      where: { id: challenge.id },
      data: {
        attemptCount: { increment: 1 },
        consumedAt: remainingAttempts === 0 ? new Date() : undefined,
      },
    });
    let lockedUntil: Date | null = null;
    if (remainingAttempts === 0 && challenge.purpose === AuthChallengePurpose.LOGIN_MFA_VERIFY) {
      lockedUntil = await this.auth.lockAccountForMfa(challenge.userId);
    }
    return { remainingAttempts, lockedUntil };
  }

  private async failSignupSession(session: SignupSessionRecord) {
    const nextCount = session.pending.attemptCount + 1;
    const remainingAttempts = this.attemptsRemaining(nextCount);
    await this.prisma.signupVerification.update({
      where: { id: session.pending.id },
      data: { attemptCount: { increment: 1 } },
    });
    return { remainingAttempts };
  }

  async verifyTrustedDevice(userId: string, rawToken: string | null | undefined, ctx: LoginContext = {}) {
    if (!rawToken?.trim()) {
      return false;
    }
    const device = await this.prisma.trustedMfaDevice.findFirst({
      where: {
        userId,
        tokenHash: this.hashToken(rawToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!device) {
      return false;
    }
    await this.prisma.trustedMfaDevice.update({
      where: { id: device.id },
      data: {
        lastUsedAt: new Date(),
        ip: ctx.ip ?? device.ip,
        userAgent: ctx.userAgent?.slice(0, 512) ?? device.userAgent,
      },
    });
    return true;
  }

  async revokeTrustedDevices(userId: string, revokedAt = new Date()) {
    await this.prisma.trustedMfaDevice.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async getStatus(userId: string) {
    const user = await this.findActiveUser(userId);
    return {
      enabled: user.mfaEnabled,
      method: user.mfaEnabled ? 'totp' : null,
      enrolledAt: user.mfaEnrolledAt?.toISOString() ?? null,
    };
  }

  async startAccountEnrollment(userId: string, ctx: LoginContext = {}) {
    const user = await this.findActiveUser(userId);
    if (user.mfaEnabled) {
      throw new BadRequestException('Authenticator app is already enabled for this account.');
    }

    await this.consumePreviousChallenges(userId, AuthChallengePurpose.SIGNUP_MFA_ENROLL);
    const { rawToken, challenge } = await this.createChallenge(
      userId,
      AuthChallengePurpose.SIGNUP_MFA_ENROLL,
      ctx,
    );

    const secret = generateSecret();
    await this.prisma.authChallenge.update({
      where: { id: challenge.id },
      data: {
        totpSecretEncrypted: this.encryptSecret(secret),
        attemptCount: 0,
      },
    });

    const setup = await this.buildTotpSetup({
      email: user.email,
      secret,
      expiresAt: challenge.expiresAt,
      attemptCount: 0,
      logContext: 'account settings MFA',
    });

    return {
      challengeToken: rawToken,
      ...setup,
    };
  }

  async restartEnrollment(token: string, ctx: LoginContext = {}) {
    void ctx;
    const { pending, payload } = await this.findValidSignupSession(token);
    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.signupSessionTtlMs());

    await this.prisma.signupVerification.update({
      where: { id: pending.id },
      data: {
        sessionTokenHash: this.hashToken(rawToken),
        totpSecretEncrypted: null,
        attemptCount: 0,
        expiresAt,
        payload: {
          ...payload,
          mfaMethod: undefined,
          mfaVerifiedAt: undefined,
          backupCodeHashes: undefined,
        },
      },
    });

    return {
      mfaSetupRequired: true as const,
      challengeToken: rawToken,
      email: pending.email,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async createLoginChallenge(userId: string, email: string, ctx: LoginContext = {}) {
    await this.consumePreviousChallenges(userId, AuthChallengePurpose.LOGIN_MFA_VERIFY);
    const { rawToken, challenge } = await this.createChallenge(
      userId,
      AuthChallengePurpose.LOGIN_MFA_VERIFY,
      ctx,
    );
    return {
      mfaRequired: true as const,
      challengeToken: rawToken,
      email,
      availableMethods: ['totp', 'backup_code'] as const,
      allowRememberDevice: true as const,
      attemptsRemaining: this.loginMaxAttempts(),
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }

  async startEnrollment(token: string) {
    const session = await this.findValidSignupSession(token);

    if (
      (session.payload.plan === 'pro' || session.payload.plan === 'plus') &&
      !session.payload.paymentVerifiedAt
    ) {
      throw new BadRequestException('Complete payment before starting authenticator setup.');
    }

    if (session.pending.attemptCount >= this.loginMaxAttempts()) {
      throw new BadRequestException('Too many authenticator verification attempts. Restart setup to continue.');
    }

    let secret = session.pending.totpSecretEncrypted
      ? this.decryptSecret(session.pending.totpSecretEncrypted)
      : null;

    if (!secret) {
      secret = generateSecret();
      await this.prisma.signupVerification.update({
        where: { id: session.pending.id },
        data: {
          totpSecretEncrypted: this.encryptSecret(secret),
        },
      });
    }

    return this.buildTotpSetup({
      email: session.pending.email,
      secret: secret as string,
      expiresAt: session.pending.expiresAt,
      attemptCount: session.pending.attemptCount,
      logContext: 'staged signup MFA',
    });
  }

  async verifyEnrollment(dto: MfaEnrollVerifyDto, ctx: LoginContext = {}) {
    void ctx;
    const session = await this.findValidSignupSession(dto.token);
    const secretEncrypted = session.pending.totpSecretEncrypted;
    if (!secretEncrypted) {
      throw new BadRequestException('Start MFA enrollment before verifying the code.');
    }

    const secret = this.decryptSecret(secretEncrypted);
    const verification = verifySync({
      secret,
      token: dto.code,
      period: 30,
      epochTolerance: 30,
    });
    if (!verification.valid) {
      const failure = await this.failSignupSession(session);
      if (failure.remainingAttempts === 0) {
        throw new BadRequestException(
          'Too many authenticator verification attempts. Restart setup to continue.',
        );
      }
      throw new BadRequestException(
        `Invalid authenticator code. ${failure.remainingAttempts} attempt(s) remaining.`,
      );
    }

    const backupCodes = this.generateBackupCodes();
    const backupCodeHashes = await Promise.all(
      backupCodes.map((code) =>
        bcrypt.hash(this.normalizeBackupCode(code), this.bcryptRounds()),
      ),
    );

    await this.prisma.signupVerification.update({
      where: { id: session.pending.id },
      data: {
        attemptCount: 0,
        payload: {
          ...session.payload,
          mfaMethod: 'totp',
          mfaVerifiedAt: new Date().toISOString(),
          backupCodeHashes,
        },
      },
    });

    return {
      backupCodes,
    };
  }

  async verifyAccountEnrollment(userId: string, dto: MfaEnrollVerifyDto, ctx: LoginContext = {}) {
    void ctx;
    const challenge = await this.findValidChallenge(dto.token, AuthChallengePurpose.SIGNUP_MFA_ENROLL);
    if (challenge.userId !== userId) {
      throw new UnauthorizedException('MFA setup does not belong to this account.');
    }
    if (challenge.user.mfaEnabled) {
      throw new BadRequestException('Authenticator app is already enabled for this account.');
    }
    const secretEncrypted = challenge.totpSecretEncrypted;
    if (!secretEncrypted) {
      throw new BadRequestException('Start MFA setup before verifying the code.');
    }

    const secret = this.decryptSecret(secretEncrypted);
    const verification = verifySync({
      secret,
      token: dto.code,
      period: 30,
      epochTolerance: 30,
    });
    if (!verification.valid) {
      const failure = await this.failChallenge(challenge);
      if (failure.remainingAttempts === 0) {
        throw new BadRequestException(
          'Too many authenticator verification attempts. Restart setup to continue.',
        );
      }
      throw new BadRequestException(
        `Invalid authenticator code. ${failure.remainingAttempts} attempt(s) remaining.`,
      );
    }

    const backupCodes = this.generateBackupCodes();
    const backupCodeHashes = await Promise.all(
      backupCodes.map((code) =>
        bcrypt.hash(this.normalizeBackupCode(code), this.bcryptRounds()),
      ),
    );
    const enrolledAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.authChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: enrolledAt },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaMethod: MfaMethod.TOTP,
          mfaEnrolledAt: enrolledAt,
          mfaSecretEncrypted: secretEncrypted,
        },
      });
      await tx.userBackupCode.deleteMany({ where: { userId } });
      await tx.userBackupCode.createMany({
        data: backupCodeHashes.map((codeHash) => ({
          userId,
          codeHash,
        })),
      });
    });

    return {
      backupCodes,
      enabled: true as const,
      method: 'totp' as const,
      enrolledAt: enrolledAt.toISOString(),
    };
  }

  async regenerateBackupCodes(userId: string, dto: MfaSettingsVerifyDto) {
    const user = await this.findActiveUser(userId);
    const secretEncrypted = user.mfaSecretEncrypted;
    if (!user.mfaEnabled || !secretEncrypted) {
      throw new BadRequestException('Authenticator app is not configured for this account.');
    }

    const secret = this.decryptSecret(secretEncrypted);
    if (!this.isValidTotp(secret, dto.code)) {
      throw new BadRequestException('Invalid authenticator code.');
    }

    const { backupCodes, backupCodeHashes } = await this.generateHashedBackupCodes();
    await this.prisma.$transaction(async (tx) => {
      await tx.userBackupCode.deleteMany({ where: { userId } });
      await tx.userBackupCode.createMany({
        data: backupCodeHashes.map((codeHash) => ({
          userId,
          codeHash,
        })),
      });
    });

    return {
      backupCodes,
      regeneratedAt: new Date().toISOString(),
    };
  }

  async disableAccountMfa(userId: string, dto: MfaSettingsVerifyDto) {
    const user = await this.findActiveUser(userId);
    const secretEncrypted = user.mfaSecretEncrypted;
    if (!user.mfaEnabled || !secretEncrypted) {
      throw new BadRequestException('Authenticator app is not configured for this account.');
    }

    const secret = this.decryptSecret(secretEncrypted);
    if (!this.isValidTotp(secret, dto.code)) {
      throw new BadRequestException('Invalid authenticator code.');
    }

    const disabledAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaMethod: null,
          mfaEnrolledAt: null,
          mfaSecretEncrypted: null,
        },
      });
      await tx.userBackupCode.deleteMany({ where: { userId } });
      await tx.trustedMfaDevice.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: disabledAt },
      });
    });

    return {
      enabled: false as const,
      method: null,
      enrolledAt: null,
    };
  }

  async verifyLogin(dto: MfaLoginVerifyDto, ctx: LoginContext = {}) {
    const challenge = await this.findValidChallenge(
      dto.challengeToken,
      AuthChallengePurpose.LOGIN_MFA_VERIFY,
    );

    const usingBackupCode = !!dto.backupCode?.trim();
    const usingTotp = !!dto.code?.trim();
    if (!usingBackupCode && !usingTotp) {
      throw new BadRequestException('Enter an authenticator code or a backup code.');
    }

    let matchedBackupCodeId: string | null = null;

    if (usingBackupCode) {
      const candidate = this.normalizeBackupCode(dto.backupCode ?? '');
      const backupCodes = await this.prisma.userBackupCode.findMany({
        where: {
          userId: challenge.userId,
          consumedAt: null,
        },
      });

      for (const codeRow of backupCodes) {
        if (await bcrypt.compare(candidate, codeRow.codeHash)) {
          matchedBackupCodeId = codeRow.id;
          break;
        }
      }

      if (!matchedBackupCodeId) {
        const failure = await this.failChallenge(challenge);
        if (failure.lockedUntil) {
          throw new BadRequestException(
            'Too many MFA attempts. Your account is temporarily locked. Try signing in again later.',
          );
        }
        throw new BadRequestException(
          `Invalid backup code. ${failure.remainingAttempts} attempt(s) remaining before lockout.`,
        );
      }
    } else {
      const secretEncrypted = challenge.user.mfaSecretEncrypted;
      if (!challenge.user.mfaEnabled || !secretEncrypted) {
        throw new BadRequestException('Authenticator app is not configured for this account.');
      }
      const secret = this.decryptSecret(secretEncrypted);
      const verification = verifySync({
        secret,
        token: dto.code ?? '',
        period: 30,
        epochTolerance: 30,
      });
      if (!verification.valid) {
        const failure = await this.failChallenge(challenge);
        if (failure.lockedUntil) {
          throw new BadRequestException(
            'Too many MFA attempts. Your account is temporarily locked. Try signing in again later.',
          );
        }
        throw new BadRequestException(
          `Invalid authenticator code. ${failure.remainingAttempts} attempt(s) remaining before lockout.`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.authChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      if (matchedBackupCodeId) {
        await tx.userBackupCode.update({
          where: { id: matchedBackupCodeId },
          data: { consumedAt: new Date() },
        });
      }
    });

    const authResult = await this.auth.issueSessionForUser(challenge.userId, ctx);
    if (dto.rememberDevice && !usingBackupCode) {
      const rawToken = randomBytes(32).toString('base64url');
      await this.prisma.trustedMfaDevice.create({
        data: {
          userId: challenge.userId,
          tokenHash: this.hashToken(rawToken),
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent?.slice(0, 512) ?? null,
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + this.trustedDeviceTtlMs()),
        },
      });
      return {
        ...authResult,
        trustedDeviceToken: rawToken,
      };
    }
    return authResult;
  }
}
