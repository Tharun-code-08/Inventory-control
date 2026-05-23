import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, type LoginContext } from './auth.service';
import { SignupRequestDto } from './dto/signup-request.dto';
import { SignupResendDto } from './dto/signup-resend.dto';
import { SignupVerifyDto } from './dto/signup-verify.dto';

export type SignupPendingPayload = {
  companyName: string;
  companyAddress?: string;
  plantName: string;
  plantAddress: string;
  contactPerson: string;
  mobile: string;
  adminName: string;
  passwordHash: string;
};

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly auth: AuthService,
  ) {}

  private signupEnabled(): boolean {
    const raw = this.config.get<string>('SIGNUP_ENABLED');
    if (raw === 'false' || raw === '0') return false;
    return true;
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

  private generateOtp(): string {
    return String(randomInt(100_000, 1_000_000));
  }

  private async uniqueCompanyCode(baseName: string): Promise<string> {
    const cleaned = baseName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    const base = cleaned || 'ORG';
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.company.findUnique({ where: { companyCode: candidate } })) {
      candidate = `${base.slice(0, 6)}${String(suffix).padStart(2, '0')}`;
      suffix += 1;
    }
    return candidate;
  }

  private async uniqueShopNumber(companyCode: string): Promise<string> {
    const prefix = companyCode.slice(0, 6).replace(/[^A-Z0-9]/g, '') || 'PLT';
    let candidate = `${prefix}-001`;
    let suffix = 1;
    while (await this.prisma.shop.findUnique({ where: { shopNumber: candidate } })) {
      candidate = `${prefix}-${String(suffix).padStart(3, '0')}`;
      suffix += 1;
    }
    return candidate;
  }

  private assertSignupEnabled() {
    if (!this.signupEnabled()) {
      throw new BadRequestException('Self-service signup is not enabled on this environment');
    }
  }

  async requestSignup(dto: SignupRequestDto) {
    this.assertSignupEnabled();

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirmation do not match');
    }

    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists. Sign in instead.');
    }

    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'Email verification is not configured. Contact support at office@softdigitconsulting.com.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const payload: SignupPendingPayload = {
      companyName: dto.companyName,
      companyAddress: dto.companyAddress,
      plantName: dto.plantName,
      plantAddress: dto.plantAddress,
      contactPerson: dto.contactPerson,
      mobile: dto.mobile,
      adminName: dto.adminName,
      passwordHash,
    };

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, this.bcryptRounds());
    const expiresAt = new Date(Date.now() + this.otpTtlMs());

    await this.prisma.signupVerification.deleteMany({
      where: { email, consumedAt: null },
    });

    await this.prisma.signupVerification.create({
      data: {
        email,
        payload,
        otpHash,
        expiresAt,
      },
    });

    await this.mail.sendSignupOtp({
      to: email,
      adminName: dto.adminName,
      companyName: dto.companyName,
      otpCode: otp,
      expiresMinutes: Math.round(this.otpTtlMs() / 60_000),
    });

    this.logger.log(`Signup OTP requested for ${email} (${dto.companyName})`);

    return {
      ok: true,
      message: 'Verification code sent to your email',
      email,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async resendOtp(dto: SignupResendDto) {
    this.assertSignupEnabled();

    const email = dto.email.toLowerCase().trim();
    const pending = await this.prisma.signupVerification.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'No active signup request found. Start registration again from the sign-up form.',
      );
    }

    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'Email verification is not configured. Contact support at office@softdigitconsulting.com.',
      );
    }

    const payload = pending.payload as SignupPendingPayload;
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, this.bcryptRounds());
    const expiresAt = new Date(Date.now() + this.otpTtlMs());

    await this.prisma.signupVerification.update({
      where: { id: pending.id },
      data: { otpHash, attemptCount: 0, expiresAt },
    });

    await this.mail.sendSignupOtp({
      to: email,
      adminName: payload.adminName,
      companyName: payload.companyName,
      otpCode: otp,
      expiresMinutes: Math.round(this.otpTtlMs() / 60_000),
    });

    return {
      ok: true,
      message: 'A new verification code has been sent',
      email,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async verifySignup(dto: SignupVerifyDto, ctx: LoginContext) {
    this.assertSignupEnabled();

    const email = dto.email.toLowerCase().trim();
    const pending = await this.prisma.signupVerification.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Verification code has expired. Request a new code.');
    }

    if (pending.attemptCount >= this.maxOtpAttempts()) {
      throw new BadRequestException('Too many attempts. Request a new verification code.');
    }

    const otpOk = await bcrypt.compare(dto.otp, pending.otpHash);
    if (!otpOk) {
      await this.prisma.signupVerification.update({
        where: { id: pending.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new BadRequestException('Invalid or expired verification code');
    }

    const payload = pending.payload as SignupPendingPayload;
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists. Sign in instead.');
    }

    const adminRole = await this.prisma.role.findFirst({ where: { name: RoleName.ADMIN } });
    if (!adminRole) {
      throw new ServiceUnavailableException('System roles are not initialized. Run database seed.');
    }

    const companyCode = await this.uniqueCompanyCode(payload.companyName);
    const shopNumber = await this.uniqueShopNumber(companyCode);

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          companyCode,
          companyName: payload.companyName,
          address: payload.companyAddress ?? payload.plantAddress,
          isActive: true,
        },
      });

      const shop = await tx.shop.create({
        data: {
          shopNumber,
          shopName: payload.plantName,
          address: payload.plantAddress,
          contactPerson: payload.contactPerson,
          mobile: payload.mobile,
          email,
          companyId: company.id,
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          name: payload.adminName,
          email,
          passwordHash: payload.passwordHash,
          roleId: adminRole.id,
          shopId: shop.id,
          isActive: true,
        },
        include: { role: true, shop: true },
      });

      await tx.signupVerification.update({
        where: { id: pending.id },
        data: { consumedAt: new Date(), attemptCount: pending.attemptCount },
      });

      return user;
    });

    const session = await this.auth.issueSessionForUser(result.id, ctx);

    this.logger.log(`Signup completed for ${email} (${payload.companyName})`);

    return session;
  }
}
