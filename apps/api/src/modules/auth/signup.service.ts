import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  MfaMethod,
  RoleName,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import {
  subscriptionEndDate,
  trialEndDate,
  type BillingInterval,
  type PlanId,
} from '../../common/plans/plan-config';
import { MailService } from '../../common/mail/mail.service';
import { WhatsAppAdapter } from '@/modules/agent-platform/channels/whatsapp/whatsapp.adapter';
import { RazorpayService } from '../billing/razorpay.service';
import { LifecycleOrchestratorService } from '../subscription-lifecycle/lifecycle-orchestrator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, type LoginContext } from './auth.service';
import { SignupCompletePaidDto } from './dto/signup-complete-paid.dto';
import { SignupFinalizeDto } from './dto/signup-finalize.dto';
import { SignupRequestDto } from './dto/signup-request.dto';
import { SignupResendDto } from './dto/signup-resend.dto';
import { SignupVerifyDto } from './dto/signup-verify.dto';

const SIGNUP_SESSION_WINDOW_MS = 60 * 60 * 1000;

export type SignupPendingPayload = {
  companyName: string;
  companyAddress?: string;
  plantName: string;
  plantAddress: string;
  contactPerson: string;
  mobile: string;
  adminName: string;
  passwordHash: string;
  plan: PlanId;
  billing: BillingInterval;
  otpVerifiedAt?: string;
  paymentVerifiedAt?: string;
  paymentOrderId?: string;
  paymentPaymentId?: string;
  mfaMethod?: 'totp';
  mfaVerifiedAt?: string;
  backupCodeHashes?: string[];
};

export type SignupSessionResult = Awaited<ReturnType<AuthService['issueSessionForUser']>>;

export type SignupMfaChallengeResult = {
  mfaSetupRequired: true;
  challengeToken: string;
  email: string;
  expiresAt: string;
};

export type SignupVerifyResult =
  | SignupMfaChallengeResult
  | {
      requiresPayment: true;
      email: string;
      plan: 'pro' | 'plus';
      billing: BillingInterval;
      signupToken: string;
      expiresAt: string;
    };

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly auth: AuthService,
    private readonly razorpay: RazorpayService,
    private readonly lifecycle: LifecycleOrchestratorService,
    private readonly whatsapp: WhatsAppAdapter,
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

  private signupSessionTtlMs(): number {
    return SIGNUP_SESSION_WINDOW_MS;
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

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private nextSignupToken() {
    const rawToken = randomBytes(32).toString('base64url');
    return {
      rawToken,
      tokenHash: this.hashToken(rawToken),
    };
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

  private isPaidSignupPlan(plan: PlanId): plan is 'pro' | 'plus' {
    return plan === 'pro' || plan === 'plus';
  }

  private async assertEmailAvailable(email: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists. Sign in instead.');
    }
  }

  private async loadPendingByToken(token: string) {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new BadRequestException('Signup session is missing or invalid.');
    }

    const pending = await this.prisma.signupVerification.findFirst({
      where: {
        sessionTokenHash: this.hashToken(trimmed),
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending || pending.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Signup session expired. Start registration again.');
    }

    const payload = pending.payload as SignupPendingPayload;
    if (!payload.otpVerifiedAt) {
      throw new BadRequestException('Email verification is incomplete. Verify your email again.');
    }

    return { pending, payload, email: pending.email };
  }

  private async rotateSignupSession(
    pendingId: string,
    email: string,
    payload: SignupPendingPayload,
  ): Promise<{ challengeToken: string; expiresAt: string }> {
    const { rawToken, tokenHash } = this.nextSignupToken();
    const expiresAt = new Date(Date.now() + this.signupSessionTtlMs());

    await this.prisma.signupVerification.update({
      where: { id: pendingId },
      data: {
        payload,
        sessionTokenHash: tokenHash,
        attemptCount: 0,
        expiresAt,
      },
    });

    this.logger.log(`Signup staged session refreshed for ${email}`);
    return { challengeToken: rawToken, expiresAt: expiresAt.toISOString() };
  }

  private async createWorkspaceFromPending(
    email: string,
    pendingId: string,
    payload: SignupPendingPayload,
    mfa:
      | {
          enabled: true;
          totpSecretEncrypted: string;
          backupCodeHashes: string[];
          enrolledAt: Date;
        }
      | {
          enabled: false;
        },
    subscription: {
      plan: SubscriptionPlan;
      billingCycle: BillingCycle | null;
      trialStartsAt: Date | null;
      trialEndsAt: Date | null;
      subscriptionEndsAt: Date | null;
    },
  ) {
    const ownerRole = await this.prisma.role.findFirst({ where: { name: RoleName.OWNER } });
    if (!ownerRole) {
      throw new ServiceUnavailableException('System roles are not initialized. Run database seed.');
    }

    const companyCode = await this.uniqueCompanyCode(payload.companyName);
    const shopNumber = await this.uniqueShopNumber(companyCode);

    return this.prisma.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email } })) {
        throw new ConflictException('An account with this email already exists. Sign in instead.');
      }

      if (payload.paymentOrderId) {
        const payment = await tx.subscriptionPayment.findUnique({
          where: { razorpayOrderId: payload.paymentOrderId },
        });
        if (!payment || payment.consumedAt) {
          throw new BadRequestException('Payment can no longer be used for signup completion.');
        }
      }

      const company = await tx.company.create({
        data: {
          companyCode,
          companyName: payload.companyName,
          address: payload.companyAddress ?? payload.plantAddress,
          isActive: true,
          subscriptionPlan: subscription.plan,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          billingCycle: subscription.billingCycle,
          trialStartsAt: subscription.trialStartsAt,
          trialEndsAt: subscription.trialEndsAt,
          subscriptionEndsAt: subscription.subscriptionEndsAt,
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
          roleId: ownerRole.id,
          shopId: shop.id,
          isActive: true,
          mfaEnabled: mfa.enabled,
          mfaMethod: mfa.enabled ? MfaMethod.TOTP : null,
          mfaEnrolledAt: mfa.enabled ? mfa.enrolledAt : null,
          mfaSecretEncrypted: mfa.enabled ? mfa.totpSecretEncrypted : null,
        },
        include: { role: true, shop: true },
      });

      if (mfa.enabled && mfa.backupCodeHashes.length > 0) {
        await tx.userBackupCode.createMany({
          data: mfa.backupCodeHashes.map((codeHash) => ({
            userId: user.id,
            codeHash,
          })),
        });
      }

      await tx.signupVerification.update({
        where: { id: pendingId },
        data: {
          consumedAt: new Date(),
          sessionTokenHash: null,
        },
      });

      if (payload.paymentOrderId) {
        await tx.subscriptionPayment.update({
          where: { razorpayOrderId: payload.paymentOrderId },
          data: {
            companyId: company.id,
            razorpayPaymentId: payload.paymentPaymentId ?? undefined,
            status: 'paid',
            verifiedAt: payload.paymentVerifiedAt ? new Date(payload.paymentVerifiedAt) : new Date(),
            consumedAt: new Date(),
          },
        });
      }

      return { user, companyId: company.id };
    });
  }

  /** E.164 digits (no "+"); bare 10-digit Indian numbers get the 91 prefix. */
  private normalizePhone(mobile: string): string | null {
    const digits = String(mobile ?? '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length >= 11 && digits.length <= 15) return digits;
    return null;
  }

  private maskPhone(phone: string): string {
    return `+${'\u2022'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
  }

  /**
   * Deliver the WhatsApp OTP via a Meta-approved authentication template.
   * Returns false (email-only signup) when the adapter is unconfigured, the
   * phone is unusable, or Meta rejects the send (e.g. template not yet
   * approved) — signup must never hard-fail on the WhatsApp leg.
   */
  private async sendWhatsAppOtp(phone: string, otp: string): Promise<boolean> {
    if (!this.whatsapp.isConfigured()) return false;
    const template = this.config.get<string>('WHATSAPP_SIGNUP_OTP_TEMPLATE') ?? 'signup_otp';
    const language = this.config.get<string>('WHATSAPP_SIGNUP_OTP_LANG') ?? 'en';
    try {
      await this.whatsapp.sendTemplate({
        to: phone,
        name: template,
        languageCode: language,
        components: [
          { type: 'body', parameters: [{ type: 'text', text: otp }] },
          // Meta authentication templates require the copy-code button param.
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
        ],
      });
      return true;
    } catch (err) {
      this.logger.warn(`WhatsApp signup OTP send failed for ${this.maskPhone(phone)}: ${(err as Error).message}`);
      return false;
    }
  }

  async requestSignup(dto: SignupRequestDto) {
    this.assertSignupEnabled();

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirmation do not match');
    }

    const email = dto.email.toLowerCase().trim();
    await this.assertEmailAvailable(email);

    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'Email verification is not configured. Contact support at office@softdigitconsulting.com.',
      );
    }

    const plan: PlanId = dto.plan === 'pro' || dto.plan === 'plus' ? dto.plan : 'trial';
    const billing: BillingInterval = dto.billing === 'yearly' ? 'yearly' : 'monthly';

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
      plan,
      billing,
    };

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, this.bcryptRounds());
    const expiresAt = new Date(Date.now() + this.otpTtlMs());

    // Second, independent OTP for the mobile number over WhatsApp.
    const phone = this.normalizePhone(dto.mobile);
    const phoneOtp = this.generateOtp();
    const phoneOtpSent = phone ? await this.sendWhatsAppOtp(phone, phoneOtp) : false;
    const phoneOtpHash = phoneOtpSent ? await bcrypt.hash(phoneOtp, this.bcryptRounds()) : null;

    await this.prisma.signupVerification.deleteMany({
      where: { email, consumedAt: null },
    });

    const verification = await this.prisma.signupVerification.create({
      data: {
        email,
        payload,
        otpHash,
        ...(phoneOtpSent && phone ? { phone, phoneOtpHash } : {}),
        expiresAt,
      },
    });

    try {
      await this.mail.sendSignupOtp({
        to: email,
        adminName: dto.adminName,
        companyName: dto.companyName,
        otpCode: otp,
        expiresMinutes: Math.round(this.otpTtlMs() / 60_000),
      });
    } catch (err) {
      await this.prisma.signupVerification.delete({ where: { id: verification.id } }).catch(() => undefined);
      this.logger.error(`Signup OTP delivery failed for ${email}: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Could not deliver the verification email. Try a Gmail address, check junk mail, or contact office@softdigitconsulting.com.',
      );
    }

    this.logger.log(`Signup OTP requested for ${email} (${dto.companyName})`);

    return {
      ok: true,
      message: phoneOtpSent
        ? 'Verification codes sent to your email and WhatsApp'
        : 'Verification code sent to your email',
      email,
      phoneOtpSent,
      ...(phoneOtpSent && phone ? { phoneMasked: this.maskPhone(phone) } : {}),
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

    const phone = this.normalizePhone(payload.mobile);
    const phoneOtp = this.generateOtp();
    const phoneOtpSent = phone ? await this.sendWhatsAppOtp(phone, phoneOtp) : false;
    const phoneOtpHash = phoneOtpSent ? await bcrypt.hash(phoneOtp, this.bcryptRounds()) : null;

    await this.prisma.signupVerification.update({
      where: { id: pending.id },
      data: {
        otpHash,
        phone: phoneOtpSent ? phone : null,
        phoneOtpHash,
        attemptCount: 0,
        sessionTokenHash: null,
        totpSecretEncrypted: null,
        expiresAt,
        payload: {
          ...payload,
          otpVerifiedAt: undefined,
          paymentVerifiedAt: undefined,
          paymentOrderId: undefined,
          paymentPaymentId: undefined,
          mfaMethod: undefined,
          mfaVerifiedAt: undefined,
          backupCodeHashes: undefined,
        },
      },
    });

    try {
      await this.mail.sendSignupOtp({
        to: email,
        adminName: payload.adminName,
        companyName: payload.companyName,
        otpCode: otp,
        expiresMinutes: Math.round(this.otpTtlMs() / 60_000),
      });
    } catch (err) {
      this.logger.error(`Signup OTP resend failed for ${email}: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Could not deliver the verification email. Try a Gmail address, check junk mail, or contact office@softdigitconsulting.com.',
      );
    }

    return {
      ok: true,
      message: phoneOtpSent
        ? 'New verification codes sent to your email and WhatsApp'
        : 'A new verification code has been sent',
      email,
      phoneOtpSent,
      ...(phoneOtpSent && phone ? { phoneMasked: this.maskPhone(phone) } : {}),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async verifySignup(dto: SignupVerifyDto, _ctx: LoginContext): Promise<SignupVerifyResult> {
    void _ctx;
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
    let phoneOtpOk = true;
    if (pending.phoneOtpHash) {
      const phoneOtp = String(dto.phoneOtp ?? '').trim();
      phoneOtpOk = phoneOtp.length > 0 && (await bcrypt.compare(phoneOtp, pending.phoneOtpHash));
    }
    if (!otpOk || !phoneOtpOk) {
      await this.prisma.signupVerification.update({
        where: { id: pending.id },
        data: { attemptCount: { increment: 1 } },
      });
      if (!otpOk && phoneOtpOk) throw new BadRequestException('Invalid or expired email code');
      if (otpOk && !phoneOtpOk) throw new BadRequestException('Invalid or expired WhatsApp code');
      throw new BadRequestException('Invalid or expired verification codes');
    }

    await this.assertEmailAvailable(email);

    const payload = pending.payload as SignupPendingPayload;
    const plan: PlanId = payload.plan ?? 'trial';
    const stagedPayload: SignupPendingPayload = {
      ...payload,
      plan,
      billing: payload.billing ?? 'monthly',
      otpVerifiedAt: new Date().toISOString(),
      paymentVerifiedAt: undefined,
      paymentOrderId: undefined,
      paymentPaymentId: undefined,
      mfaMethod: undefined,
      mfaVerifiedAt: undefined,
      backupCodeHashes: undefined,
    };

    const stagedSession = await this.rotateSignupSession(pending.id, email, stagedPayload);

    if (this.isPaidSignupPlan(plan)) {
      this.logger.log(`Signup OTP verified for ${email}; awaiting payment (${plan})`);
      return {
        requiresPayment: true,
        email,
        plan,
        billing: stagedPayload.billing,
        signupToken: stagedSession.challengeToken,
        expiresAt: stagedSession.expiresAt,
      };
    }

    this.logger.log(`Signup OTP verified for ${email}; awaiting MFA finalization`);
    return {
      mfaSetupRequired: true,
      challengeToken: stagedSession.challengeToken,
      email,
      expiresAt: stagedSession.expiresAt,
    };
  }

  async completePaidSignup(
    dto: SignupCompletePaidDto,
    _ctx: LoginContext,
  ): Promise<SignupMfaChallengeResult> {
    void _ctx;
    this.assertSignupEnabled();

    const { pending, payload, email } = await this.loadPendingByToken(dto.token);

    if (!this.isPaidSignupPlan(payload.plan)) {
      throw new BadRequestException('This signup does not require payment.');
    }

    const orderId = dto.razorpay_order_id.trim();
    const paymentId = dto.razorpay_payment_id.trim();
    const signature = dto.razorpay_signature.trim();

    if (!this.razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
      throw new BadRequestException('Payment signature verification failed');
    }

    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!payment) {
      throw new BadRequestException('Payment order not found');
    }
    if (payment.consumedAt) {
      throw new BadRequestException('Payment already used');
    }

    const expectedPlan = payload.plan === 'pro' ? SubscriptionPlan.PRO : SubscriptionPlan.PLUS;
    if (payment.plan !== expectedPlan) {
      throw new BadRequestException('Payment plan does not match your selected plan');
    }

    const now = new Date();
    if (payment.status !== 'paid') {
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: paymentId,
          status: 'paid',
          verifiedAt: now,
        },
      });
    }

    const stagedPayload: SignupPendingPayload = {
      ...payload,
      paymentVerifiedAt: now.toISOString(),
      paymentOrderId: orderId,
      paymentPaymentId: paymentId,
      mfaMethod: undefined,
      mfaVerifiedAt: undefined,
      backupCodeHashes: undefined,
    };

    const stagedSession = await this.rotateSignupSession(pending.id, email, stagedPayload);
    this.logger.log(`Paid signup payment verified for ${email} (${payload.companyName}, ${payment.plan})`);
    return {
      mfaSetupRequired: true,
      challengeToken: stagedSession.challengeToken,
      email,
      expiresAt: stagedSession.expiresAt,
    };
  }

  async finalizeSignup(dto: SignupFinalizeDto, ctx: LoginContext): Promise<SignupSessionResult> {
    this.assertSignupEnabled();

    const { pending, payload, email } = await this.loadPendingByToken(dto.token);
    await this.assertEmailAvailable(email);

    const skipMfa = dto.skipMfa === true;
    const mfa =
      skipMfa
        ? ({ enabled: false } as const)
        : (() => {
            if (!payload.mfaVerifiedAt || payload.mfaMethod !== 'totp') {
              throw new BadRequestException('Authenticator setup is incomplete. Finish MFA setup first.');
            }

            if (!pending.totpSecretEncrypted) {
              throw new BadRequestException(
                'Authenticator setup is incomplete. Restart MFA setup and try again.',
              );
            }

            const backupCodeHashes = payload.backupCodeHashes ?? [];
            if (backupCodeHashes.length === 0) {
              throw new BadRequestException('Backup codes are missing. Verify authenticator setup again.');
            }

            return {
              enabled: true as const,
              totpSecretEncrypted: pending.totpSecretEncrypted,
              backupCodeHashes,
              enrolledAt: new Date(payload.mfaVerifiedAt),
            };
          })();

    let subscription:
      | {
          plan: SubscriptionPlan;
          billingCycle: BillingCycle | null;
          trialStartsAt: Date | null;
          trialEndsAt: Date | null;
          subscriptionEndsAt: Date | null;
        }
      | null = null;

    if (this.isPaidSignupPlan(payload.plan)) {
      if (!payload.paymentOrderId || !payload.paymentVerifiedAt) {
        throw new BadRequestException('Payment is incomplete. Complete payment before finishing signup.');
      }
      const payment = await this.prisma.subscriptionPayment.findUnique({
        where: { razorpayOrderId: payload.paymentOrderId },
      });
      if (!payment || payment.consumedAt) {
        throw new BadRequestException('Payment can no longer be used for signup completion.');
      }
      subscription = {
        plan: payment.plan,
        billingCycle: payment.billingCycle,
        trialStartsAt: null,
        trialEndsAt: null,
        subscriptionEndsAt: subscriptionEndDate(payment.plan, payment.billingCycle, new Date()),
      };
    } else {
      const now = new Date();
      subscription = {
        plan: SubscriptionPlan.TRIAL,
        billingCycle: null,
        trialStartsAt: now,
        trialEndsAt: trialEndDate(now),
        subscriptionEndsAt: null,
      };
    }

    const result = await this.createWorkspaceFromPending(
      email,
      pending.id,
      payload,
      mfa,
      subscription,
    );

    const paymentRecord =
      payload.paymentOrderId
        ? await this.prisma.subscriptionPayment.findUnique({
            where: { razorpayOrderId: payload.paymentOrderId },
          })
        : null;

    if (subscription?.plan === SubscriptionPlan.TRIAL) {
      void this.lifecycle.onTrialStarted({
        companyId: result.companyId,
        ownerEmail: email,
        companyName: payload.companyName,
      });
    } else if (subscription && paymentRecord) {
      void this.lifecycle.onSubscriptionActivated({
        companyId: result.companyId,
        ownerEmail: email,
        companyName: payload.companyName,
        plan: subscription.plan,
        billingCycle: subscription.billingCycle!,
        amountPaise: paymentRecord.amountPaise,
        paymentId: paymentRecord.id,
      });
    }

    const session = await this.auth.issueSessionForUser(result.user.id, ctx);
    this.logger.log(`Signup finalized for ${email} (${payload.companyName})`);
    return session;
  }
}
