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
var PasswordResetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const undici_1 = require("undici");
const mail_service_1 = require("../../common/mail/mail.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const auth_service_1 = require("./auth.service");
const RESET_TTL_MINUTES = 10;
const RESET_MAX_ATTEMPTS = 5;
const RESET_REQUEST_COOLDOWN_SECONDS = 60;
let PasswordResetService = PasswordResetService_1 = class PasswordResetService {
    prisma;
    config;
    mail;
    auth;
    logger = new common_1.Logger(PasswordResetService_1.name);
    constructor(prisma, config, mail, auth) {
        this.prisma = prisma;
        this.config = config;
        this.mail = mail;
        this.auth = auth;
    }
    normalizeEmail(email) {
        return email.toLowerCase().trim();
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    bcryptRounds() {
        const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
        return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
    }
    resetTtlMs() {
        return RESET_TTL_MINUTES * 60_000;
    }
    requestCooldownMs() {
        return RESET_REQUEST_COOLDOWN_SECONDS * 1000;
    }
    maxOtpAttempts() {
        return RESET_MAX_ATTEMPTS;
    }
    generateOtp() {
        return String((0, crypto_1.randomInt)(100_000, 1_000_000));
    }
    genericRequestResponse(method) {
        return {
            ok: true,
            method,
            message: method === 'otp'
                ? 'If an account exists, a reset code has been sent to the email address.'
                : 'If an account exists, a reset link has been sent to the email address.',
        };
    }
    turnstileSecret() {
        const secret = this.config.get('TURNSTILE_SECRET_KEY')?.trim();
        return secret || undefined;
    }
    async verifyTurnstile(responseToken) {
        const secret = this.turnstileSecret();
        if (!secret)
            return;
        if (!responseToken) {
            throw new common_1.BadRequestException('Captcha verification failed. Please try again.');
        }
        try {
            const { statusCode, body } = await (0, undici_1.request)('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ secret, response: responseToken }).toString(),
            });
            if (statusCode >= 500) {
                throw new common_1.ServiceUnavailableException('Captcha verification is unavailable. Try again.');
            }
            const payload = (await body.json());
            if (!payload.success) {
                this.logger.warn(`Turnstile verification failed during password reset: ${JSON.stringify(payload['error-codes'] ?? [])}`);
                throw new common_1.BadRequestException('Captcha verification failed. Please try again.');
            }
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException || err instanceof common_1.ServiceUnavailableException) {
                throw err;
            }
            this.logger.error(`Turnstile verify error during password reset: ${err.message}`);
            throw new common_1.ServiceUnavailableException('Captcha verification is unavailable. Try again.');
        }
    }
    async applyPasswordReset(userId, email, requestId, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive) {
            throw new common_1.BadRequestException('Reset request is invalid or expired.');
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
                throw new common_1.BadRequestException('Reset request is invalid or expired.');
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
    async requestReset(dto, ctx = {}) {
        if (!this.mail.isConfigured()) {
            throw new common_1.ServiceUnavailableException('Password reset email is not configured. Contact support to reset your password.');
        }
        const email = this.normalizeEmail(dto.email);
        const method = dto.method === 'magic_link' ? client_1.PasswordResetMethod.MAGIC_LINK : client_1.PasswordResetMethod.OTP;
        const recentPending = await this.prisma.passwordResetRequest.findFirst({
            where: {
                email,
                method,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (recentPending?.lastSentAt &&
            Date.now() - recentPending.lastSentAt.getTime() < this.requestCooldownMs()) {
            return this.genericRequestResponse(dto.method);
        }
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
            return this.genericRequestResponse(dto.method);
        }
        const expiresAt = new Date(Date.now() + this.resetTtlMs());
        const sentAt = new Date();
        const token = method === client_1.PasswordResetMethod.MAGIC_LINK ? (0, crypto_1.randomBytes)(32).toString('base64url') : null;
        const otp = method === client_1.PasswordResetMethod.OTP ? this.generateOtp() : null;
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
            if (method === client_1.PasswordResetMethod.OTP && otp) {
                await this.mail.sendPasswordResetOtp({
                    to: email,
                    userName: user.name || email.split('@')[0],
                    otpCode: otp,
                    expiresMinutes: RESET_TTL_MINUTES,
                });
            }
            else if (method === client_1.PasswordResetMethod.MAGIC_LINK && token) {
                await this.mail.sendPasswordResetLink({
                    to: email,
                    userName: user.name || email.split('@')[0],
                    token,
                    expiresMinutes: RESET_TTL_MINUTES,
                });
            }
        }
        catch (err) {
            await this.prisma.passwordResetRequest.delete({ where: { id: reset.id } }).catch(() => undefined);
            this.logger.error(`Password reset delivery failed for ${email}: ${err.message}`);
            throw new common_1.ServiceUnavailableException('Could not deliver the password reset email. Please try again in a few minutes.');
        }
        return this.genericRequestResponse(dto.method);
    }
    async previewMagicLink(token) {
        const tokenHash = this.hashToken(token);
        const reset = await this.prisma.passwordResetRequest.findFirst({
            where: {
                method: client_1.PasswordResetMethod.MAGIC_LINK,
                linkTokenHash: tokenHash,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
        if (!reset || !reset.user?.isActive) {
            throw new common_1.BadRequestException('Reset link is invalid or expired.');
        }
        return {
            email: reset.email,
            expiresAt: reset.expiresAt.toISOString(),
        };
    }
    async completeMagicLink(dto, ctx = {}) {
        await this.verifyTurnstile(dto.turnstileToken);
        const tokenHash = this.hashToken(dto.token);
        const reset = await this.prisma.passwordResetRequest.findFirst({
            where: {
                method: client_1.PasswordResetMethod.MAGIC_LINK,
                linkTokenHash: tokenHash,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!reset || !reset.user?.isActive) {
            throw new common_1.BadRequestException('Reset link is invalid or expired.');
        }
        await this.applyPasswordReset(reset.userId, reset.email, reset.id, dto.newPassword);
        return this.auth.issueSessionForUser(reset.userId, ctx);
    }
    async completeOtp(dto, ctx = {}) {
        await this.verifyTurnstile(dto.turnstileToken);
        const email = this.normalizeEmail(dto.email);
        const reset = await this.prisma.passwordResetRequest.findFirst({
            where: {
                email,
                method: client_1.PasswordResetMethod.OTP,
                consumedAt: null,
            },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!reset || !reset.user?.isActive || !reset.otpHash) {
            throw new common_1.BadRequestException('Invalid or expired reset code.');
        }
        if (reset.expiresAt.getTime() <= Date.now()) {
            throw new common_1.BadRequestException('Reset code has expired. Request a new code.');
        }
        if (reset.attemptCount >= this.maxOtpAttempts()) {
            throw new common_1.BadRequestException('Too many attempts. Request a new reset code.');
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
                throw new common_1.BadRequestException('Too many attempts. Request a new reset code.');
            }
            throw new common_1.BadRequestException('Invalid or expired reset code.');
        }
        await this.applyPasswordReset(reset.userId, reset.email, reset.id, dto.newPassword);
        return this.auth.issueSessionForUser(reset.userId, ctx);
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = PasswordResetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        mail_service_1.MailService,
        auth_service_1.AuthService])
], PasswordResetService);
//# sourceMappingURL=password-reset.service.js.map