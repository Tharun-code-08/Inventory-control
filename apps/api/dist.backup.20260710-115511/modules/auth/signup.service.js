"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SignupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const plan_config_1 = require("../../common/plans/plan-config");
const mail_service_1 = require("../../common/mail/mail.service");
const whatsapp_adapter_1 = require("../agent-platform/channels/whatsapp/whatsapp.adapter");
const razorpay_service_1 = require("../billing/razorpay.service");
const lifecycle_orchestrator_service_1 = require("../subscription-lifecycle/lifecycle-orchestrator.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const auth_service_1 = require("./auth.service");
const SIGNUP_SESSION_WINDOW_MS = 60 * 60 * 1000;
let SignupService = SignupService_1 = class SignupService {
    prisma;
    config;
    mail;
    auth;
    razorpay;
    lifecycle;
    whatsapp;
    logger = new common_1.Logger(SignupService_1.name);
    constructor(prisma, config, mail, auth, razorpay, lifecycle, whatsapp) {
        this.prisma = prisma;
        this.config = config;
        this.mail = mail;
        this.auth = auth;
        this.razorpay = razorpay;
        this.lifecycle = lifecycle;
        this.whatsapp = whatsapp;
    }
    signupEnabled() {
        const raw = this.config.get('SIGNUP_ENABLED');
        if (raw === 'false' || raw === '0')
            return false;
        return true;
    }
    otpTtlMs() {
        const minutes = Number(this.config.get('SIGNUP_OTP_TTL_MIN') ?? 15);
        return Math.max(5, minutes) * 60_000;
    }
    signupSessionTtlMs() {
        return SIGNUP_SESSION_WINDOW_MS;
    }
    maxOtpAttempts() {
        return Number(this.config.get('SIGNUP_OTP_MAX_ATTEMPTS') ?? 5);
    }
    bcryptRounds() {
        const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
        return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
    }
    generateOtp() {
        return String((0, crypto_1.randomInt)(100_000, 1_000_000));
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    nextSignupToken() {
        const rawToken = (0, crypto_1.randomBytes)(32).toString('base64url');
        return {
            rawToken,
            tokenHash: this.hashToken(rawToken),
        };
    }
    async uniqueCompanyCode(baseName) {
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
    async uniqueShopNumber(companyCode) {
        const prefix = companyCode.slice(0, 6).replace(/[^A-Z0-9]/g, '') || 'PLT';
        let candidate = `${prefix}-001`;
        let suffix = 1;
        while (await this.prisma.shop.findUnique({ where: { shopNumber: candidate } })) {
            candidate = `${prefix}-${String(suffix).padStart(3, '0')}`;
            suffix += 1;
        }
        return candidate;
    }
    assertSignupEnabled() {
        if (!this.signupEnabled()) {
            throw new common_1.BadRequestException('Self-service signup is not enabled on this environment');
        }
    }
    isPaidSignupPlan(plan) {
        return plan === 'pro' || plan === 'plus';
    }
    async assertEmailAvailable(email) {
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new common_1.ConflictException('An account with this email already exists. Sign in instead.');
        }
    }
    async loadPendingByToken(token) {
        const trimmed = token.trim();
        if (!trimmed) {
            throw new common_1.BadRequestException('Signup session is missing or invalid.');
        }
        const pending = await this.prisma.signupVerification.findFirst({
            where: {
                sessionTokenHash: this.hashToken(trimmed),
                consumedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!pending || pending.expiresAt.getTime() <= Date.now()) {
            throw new common_1.BadRequestException('Signup session expired. Start registration again.');
        }
        const payload = pending.payload;
        if (!payload.otpVerifiedAt) {
            throw new common_1.BadRequestException('Email verification is incomplete. Verify your email again.');
        }
        return { pending, payload, email: pending.email };
    }
    async rotateSignupSession(pendingId, email, payload) {
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
    async createWorkspaceFromPending(email, pendingId, payload, mfa, subscription) {
        const ownerRole = await this.prisma.role.findFirst({ where: { name: client_1.RoleName.OWNER } });
        if (!ownerRole) {
            throw new common_1.ServiceUnavailableException('System roles are not initialized. Run database seed.');
        }
        const companyCode = await this.uniqueCompanyCode(payload.companyName);
        const shopNumber = await this.uniqueShopNumber(companyCode);
        return this.prisma.$transaction(async (tx) => {
            if (await tx.user.findUnique({ where: { email } })) {
                throw new common_1.ConflictException('An account with this email already exists. Sign in instead.');
            }
            if (payload.paymentOrderId) {
                const payment = await tx.subscriptionPayment.findUnique({
                    where: { razorpayOrderId: payload.paymentOrderId },
                });
                if (!payment || payment.consumedAt) {
                    throw new common_1.BadRequestException('Payment can no longer be used for signup completion.');
                }
            }
            const company = await tx.company.create({
                data: {
                    companyCode,
                    companyName: payload.companyName,
                    address: payload.companyAddress ?? payload.plantAddress,
                    isActive: true,
                    subscriptionPlan: subscription.plan,
                    subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
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
                    mfaMethod: mfa.enabled ? client_1.MfaMethod.TOTP : null,
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
    normalizePhone(mobile) {
        const digits = String(mobile ?? '').replace(/\D/g, '');
        if (digits.length === 10)
            return `91${digits}`;
        if (digits.length >= 11 && digits.length <= 15)
            return digits;
        return null;
    }
    maskPhone(phone) {
        return `+${'\u2022'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
    }
    async sendWhatsAppOtp(phone, otp) {
        if (!this.whatsapp.isConfigured())
            return false;
        const template = this.config.get('WHATSAPP_SIGNUP_OTP_TEMPLATE') ?? 'signup_otp';
        const language = this.config.get('WHATSAPP_SIGNUP_OTP_LANG') ?? 'en';
        try {
            await this.whatsapp.sendTemplate({
                to: phone,
                name: template,
                languageCode: language,
                components: [
                    { type: 'body', parameters: [{ type: 'text', text: otp }] },
                    { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
                ],
            });
            return true;
        }
        catch (err) {
            this.logger.warn(`WhatsApp signup OTP send failed for ${this.maskPhone(phone)}: ${err.message}`);
            return false;
        }
    }
    async requestSignup(dto) {
        this.assertSignupEnabled();
        if (dto.password !== dto.confirmPassword) {
            throw new common_1.BadRequestException('Password and confirmation do not match');
        }
        const email = dto.email.toLowerCase().trim();
        await this.assertEmailAvailable(email);
        if (!this.mail.isConfigured()) {
            throw new common_1.ServiceUnavailableException('Email verification is not configured. Contact support at office@softdigitconsulting.com.');
        }
        const plan = dto.plan === 'pro' || dto.plan === 'plus' ? dto.plan : 'trial';
        const billing = dto.billing === 'yearly' ? 'yearly' : 'monthly';
        const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
        const payload = {
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
        }
        catch (err) {
            await this.prisma.signupVerification.delete({ where: { id: verification.id } }).catch(() => undefined);
            this.logger.error(`Signup OTP delivery failed for ${email}: ${err.message}`);
            throw new common_1.ServiceUnavailableException('Could not deliver the verification email. Try a Gmail address, check junk mail, or contact office@softdigitconsulting.com.');
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
    async resendOtp(dto) {
        this.assertSignupEnabled();
        const email = dto.email.toLowerCase().trim();
        const pending = await this.prisma.signupVerification.findFirst({
            where: { email, consumedAt: null },
            orderBy: { createdAt: 'desc' },
        });
        if (!pending || pending.expiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('No active signup request found. Start registration again from the sign-up form.');
        }
        if (!this.mail.isConfigured()) {
            throw new common_1.ServiceUnavailableException('Email verification is not configured. Contact support at office@softdigitconsulting.com.');
        }
        const payload = pending.payload;
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
        }
        catch (err) {
            this.logger.error(`Signup OTP resend failed for ${email}: ${err.message}`);
            throw new common_1.ServiceUnavailableException('Could not deliver the verification email. Try a Gmail address, check junk mail, or contact office@softdigitconsulting.com.');
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
    async verifySignup(dto, _ctx) {
        void _ctx;
        this.assertSignupEnabled();
        const email = dto.email.toLowerCase().trim();
        const pending = await this.prisma.signupVerification.findFirst({
            where: { email, consumedAt: null },
            orderBy: { createdAt: 'desc' },
        });
        if (!pending) {
            throw new common_1.BadRequestException('Invalid or expired verification code');
        }
        if (pending.expiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Verification code has expired. Request a new code.');
        }
        if (pending.attemptCount >= this.maxOtpAttempts()) {
            throw new common_1.BadRequestException('Too many attempts. Request a new verification code.');
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
            if (!otpOk && phoneOtpOk)
                throw new common_1.BadRequestException('Invalid or expired email code');
            if (otpOk && !phoneOtpOk)
                throw new common_1.BadRequestException('Invalid or expired WhatsApp code');
            throw new common_1.BadRequestException('Invalid or expired verification codes');
        }
        await this.assertEmailAvailable(email);
        const payload = pending.payload;
        const plan = payload.plan ?? 'trial';
        const stagedPayload = {
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
    async completePaidSignup(dto, _ctx) {
        void _ctx;
        this.assertSignupEnabled();
        const { pending, payload, email } = await this.loadPendingByToken(dto.token);
        if (!this.isPaidSignupPlan(payload.plan)) {
            throw new common_1.BadRequestException('This signup does not require payment.');
        }
        const orderId = dto.razorpay_order_id.trim();
        const paymentId = dto.razorpay_payment_id.trim();
        const signature = dto.razorpay_signature.trim();
        if (!this.razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
            throw new common_1.BadRequestException('Payment signature verification failed');
        }
        const payment = await this.prisma.subscriptionPayment.findUnique({
            where: { razorpayOrderId: orderId },
        });
        if (!payment) {
            throw new common_1.BadRequestException('Payment order not found');
        }
        if (payment.consumedAt) {
            throw new common_1.BadRequestException('Payment already used');
        }
        const expectedPlan = payload.plan === 'pro' ? client_1.SubscriptionPlan.PRO : client_1.SubscriptionPlan.PLUS;
        if (payment.plan !== expectedPlan) {
            throw new common_1.BadRequestException('Payment plan does not match your selected plan');
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
        const stagedPayload = {
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
    async finalizeSignup(dto, ctx) {
        this.assertSignupEnabled();
        const { pending, payload, email } = await this.loadPendingByToken(dto.token);
        await this.assertEmailAvailable(email);
        const skipMfa = dto.skipMfa === true;
        const mfa = skipMfa
            ? { enabled: false }
            : (() => {
                if (!payload.mfaVerifiedAt || payload.mfaMethod !== 'totp') {
                    throw new common_1.BadRequestException('Authenticator setup is incomplete. Finish MFA setup first.');
                }
                if (!pending.totpSecretEncrypted) {
                    throw new common_1.BadRequestException('Authenticator setup is incomplete. Restart MFA setup and try again.');
                }
                const backupCodeHashes = payload.backupCodeHashes ?? [];
                if (backupCodeHashes.length === 0) {
                    throw new common_1.BadRequestException('Backup codes are missing. Verify authenticator setup again.');
                }
                return {
                    enabled: true,
                    totpSecretEncrypted: pending.totpSecretEncrypted,
                    backupCodeHashes,
                    enrolledAt: new Date(payload.mfaVerifiedAt),
                };
            })();
        let subscription = null;
        if (this.isPaidSignupPlan(payload.plan)) {
            if (!payload.paymentOrderId || !payload.paymentVerifiedAt) {
                throw new common_1.BadRequestException('Payment is incomplete. Complete payment before finishing signup.');
            }
            const payment = await this.prisma.subscriptionPayment.findUnique({
                where: { razorpayOrderId: payload.paymentOrderId },
            });
            if (!payment || payment.consumedAt) {
                throw new common_1.BadRequestException('Payment can no longer be used for signup completion.');
            }
            subscription = {
                plan: payment.plan,
                billingCycle: payment.billingCycle,
                trialStartsAt: null,
                trialEndsAt: null,
                subscriptionEndsAt: (0, plan_config_1.subscriptionEndDate)(payment.plan, payment.billingCycle, new Date()),
            };
        }
        else {
            const now = new Date();
            subscription = {
                plan: client_1.SubscriptionPlan.TRIAL,
                billingCycle: null,
                trialStartsAt: now,
                trialEndsAt: (0, plan_config_1.trialEndDate)(now),
                subscriptionEndsAt: null,
            };
        }
        const result = await this.createWorkspaceFromPending(email, pending.id, payload, mfa, subscription);
        const paymentRecord = payload.paymentOrderId
            ? await this.prisma.subscriptionPayment.findUnique({
                where: { razorpayOrderId: payload.paymentOrderId },
            })
            : null;
        if (subscription?.plan === client_1.SubscriptionPlan.TRIAL) {
            void this.lifecycle.onTrialStarted({
                companyId: result.companyId,
                ownerEmail: email,
                companyName: payload.companyName,
            });
        }
        else if (subscription && paymentRecord) {
            void this.lifecycle.onSubscriptionActivated({
                companyId: result.companyId,
                ownerEmail: email,
                companyName: payload.companyName,
                plan: subscription.plan,
                billingCycle: subscription.billingCycle,
                amountPaise: paymentRecord.amountPaise,
                paymentId: paymentRecord.id,
            });
        }
        const session = await this.auth.issueSessionForUser(result.user.id, ctx);
        this.logger.log(`Signup finalized for ${email} (${payload.companyName})`);
        return session;
    }
};
exports.SignupService = SignupService;
exports.SignupService = SignupService = SignupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        mail_service_1.MailService,
        auth_service_1.AuthService,
        razorpay_service_1.RazorpayService,
        lifecycle_orchestrator_service_1.LifecycleOrchestratorService,
        whatsapp_adapter_1.WhatsAppAdapter])
], SignupService);
//# sourceMappingURL=signup.service.js.map