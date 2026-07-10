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
var MfaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const otplib_1 = require("otplib");
const QRCode = require("qrcode");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const auth_service_1 = require("./auth.service");
let MfaService = MfaService_1 = class MfaService {
    prisma;
    config;
    auth;
    logger = new common_1.Logger(MfaService_1.name);
    constructor(prisma, config, auth) {
        this.prisma = prisma;
        this.config = config;
        this.auth = auth;
    }
    bcryptRounds() {
        const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
        return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
    }
    challengeTtlMs() {
        const minutes = Number(this.config.get('MFA_CHALLENGE_TTL_MIN') ?? 15);
        return Math.max(5, minutes) * 60_000;
    }
    loginMaxAttempts() {
        return Number(this.config.get('MFA_LOGIN_MAX_ATTEMPTS') ?? 5);
    }
    backupCodeCount() {
        return Number(this.config.get('MFA_BACKUP_CODE_COUNT') ?? 8);
    }
    trustedDeviceTtlMs() {
        const days = Number(this.config.get('MFA_TRUSTED_DEVICE_DAYS') ?? 7);
        return Math.max(1, days) * 24 * 60 * 60 * 1000;
    }
    signupSessionTtlMs() {
        return 60 * 60 * 1000;
    }
    attemptsRemaining(attemptCount) {
        return Math.max(0, this.loginMaxAttempts() - attemptCount);
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    encryptionKey() {
        const explicit = this.config.get('MFA_SECRET_ENCRYPTION_KEY')?.trim();
        const seed = explicit ||
            `${this.config.get('JWT_SECRET') ?? ''}:${this.config.get('REFRESH_SECRET') ?? ''}:retail-ims-mfa`;
        return (0, crypto_1.createHash)('sha256').update(seed).digest();
    }
    encryptSecret(secret) {
        const iv = (0, crypto_1.randomBytes)(12);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', this.encryptionKey(), iv);
        const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
    }
    decryptSecret(payload) {
        const [ivRaw, tagRaw, encryptedRaw] = payload.split('.');
        if (!ivRaw || !tagRaw || !encryptedRaw) {
            throw new common_1.UnauthorizedException('Stored MFA secret is invalid');
        }
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', this.encryptionKey(), Buffer.from(ivRaw, 'base64url'));
        decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encryptedRaw, 'base64url')),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }
    normalizeBackupCode(code) {
        return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    generateBackupCodes() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const nextChunk = () => Array.from((0, crypto_1.randomBytes)(4), (byte) => alphabet[byte % alphabet.length]).join('');
        return Array.from({ length: this.backupCodeCount() }, () => `${nextChunk()}-${nextChunk()}`);
    }
    async consumePreviousChallenges(userId, purpose) {
        await this.prisma.authChallenge.updateMany({
            where: { userId, purpose, consumedAt: null },
            data: { consumedAt: new Date() },
        });
    }
    async createChallenge(userId, purpose, ctx) {
        const rawToken = (0, crypto_1.randomBytes)(32).toString('base64url');
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
    async findValidChallenge(token, purpose) {
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
            throw new common_1.BadRequestException('MFA challenge is invalid or expired.');
        }
        return challenge;
    }
    async findValidSignupSession(token) {
        const pending = await this.prisma.signupVerification.findFirst({
            where: {
                sessionTokenHash: this.hashToken(token),
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!pending) {
            throw new common_1.BadRequestException('MFA setup session is invalid or expired.');
        }
        const payload = pending.payload;
        if (!payload.otpVerifiedAt) {
            throw new common_1.BadRequestException('Email verification must be completed before MFA setup.');
        }
        return { pending, payload };
    }
    async findActiveUser(userId) {
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
            throw new common_1.UnauthorizedException('Account is not active');
        }
        return user;
    }
    async buildTotpSetup(args) {
        const otpAuthUrl = (0, otplib_1.generateURI)({
            issuer: 'SoftdigitIMS',
            label: args.email,
            secret: args.secret,
            period: 30,
        });
        let qrCodeDataUrl = null;
        try {
            qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
                width: 240,
                margin: 1,
            });
        }
        catch (error) {
            this.logger.warn(`QR code generation failed for ${args.logContext} (${args.email}): ${error.message}`);
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
    isValidTotp(secret, code) {
        const verification = (0, otplib_1.verifySync)({
            secret,
            token: code,
            period: 30,
            epochTolerance: 30,
        });
        return verification.valid;
    }
    async generateHashedBackupCodes() {
        const backupCodes = this.generateBackupCodes();
        const backupCodeHashes = await Promise.all(backupCodes.map((code) => bcrypt.hash(this.normalizeBackupCode(code), this.bcryptRounds())));
        return { backupCodes, backupCodeHashes };
    }
    async failChallenge(challenge) {
        const nextCount = challenge.attemptCount + 1;
        const remainingAttempts = this.attemptsRemaining(nextCount);
        await this.prisma.authChallenge.update({
            where: { id: challenge.id },
            data: {
                attemptCount: { increment: 1 },
                consumedAt: remainingAttempts === 0 ? new Date() : undefined,
            },
        });
        let lockedUntil = null;
        if (remainingAttempts === 0 && challenge.purpose === client_1.AuthChallengePurpose.LOGIN_MFA_VERIFY) {
            lockedUntil = await this.auth.lockAccountForMfa(challenge.userId);
        }
        return { remainingAttempts, lockedUntil };
    }
    async failSignupSession(session) {
        const nextCount = session.pending.attemptCount + 1;
        const remainingAttempts = this.attemptsRemaining(nextCount);
        await this.prisma.signupVerification.update({
            where: { id: session.pending.id },
            data: { attemptCount: { increment: 1 } },
        });
        return { remainingAttempts };
    }
    async verifyTrustedDevice(userId, rawToken, ctx = {}) {
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
    async revokeTrustedDevices(userId, revokedAt = new Date()) {
        await this.prisma.trustedMfaDevice.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt },
        });
    }
    async getStatus(userId) {
        const user = await this.findActiveUser(userId);
        return {
            enabled: user.mfaEnabled,
            method: user.mfaEnabled ? 'totp' : null,
            enrolledAt: user.mfaEnrolledAt?.toISOString() ?? null,
        };
    }
    async startAccountEnrollment(userId, ctx = {}) {
        const user = await this.findActiveUser(userId);
        if (user.mfaEnabled) {
            throw new common_1.BadRequestException('Authenticator app is already enabled for this account.');
        }
        await this.consumePreviousChallenges(userId, client_1.AuthChallengePurpose.SIGNUP_MFA_ENROLL);
        const { rawToken, challenge } = await this.createChallenge(userId, client_1.AuthChallengePurpose.SIGNUP_MFA_ENROLL, ctx);
        const secret = (0, otplib_1.generateSecret)();
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
    async restartEnrollment(token, ctx = {}) {
        void ctx;
        const { pending, payload } = await this.findValidSignupSession(token);
        const rawToken = (0, crypto_1.randomBytes)(32).toString('base64url');
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
            mfaSetupRequired: true,
            challengeToken: rawToken,
            email: pending.email,
            expiresAt: expiresAt.toISOString(),
        };
    }
    async createLoginChallenge(userId, email, ctx = {}) {
        await this.consumePreviousChallenges(userId, client_1.AuthChallengePurpose.LOGIN_MFA_VERIFY);
        const { rawToken, challenge } = await this.createChallenge(userId, client_1.AuthChallengePurpose.LOGIN_MFA_VERIFY, ctx);
        return {
            mfaRequired: true,
            challengeToken: rawToken,
            email,
            availableMethods: ['totp', 'backup_code'],
            allowRememberDevice: true,
            attemptsRemaining: this.loginMaxAttempts(),
            expiresAt: challenge.expiresAt.toISOString(),
        };
    }
    async startEnrollment(token) {
        const session = await this.findValidSignupSession(token);
        if ((session.payload.plan === 'pro' || session.payload.plan === 'plus') &&
            !session.payload.paymentVerifiedAt) {
            throw new common_1.BadRequestException('Complete payment before starting authenticator setup.');
        }
        if (session.pending.attemptCount >= this.loginMaxAttempts()) {
            throw new common_1.BadRequestException('Too many authenticator verification attempts. Restart setup to continue.');
        }
        let secret = session.pending.totpSecretEncrypted
            ? this.decryptSecret(session.pending.totpSecretEncrypted)
            : null;
        if (!secret) {
            secret = (0, otplib_1.generateSecret)();
            await this.prisma.signupVerification.update({
                where: { id: session.pending.id },
                data: {
                    totpSecretEncrypted: this.encryptSecret(secret),
                },
            });
        }
        return this.buildTotpSetup({
            email: session.pending.email,
            secret: secret,
            expiresAt: session.pending.expiresAt,
            attemptCount: session.pending.attemptCount,
            logContext: 'staged signup MFA',
        });
    }
    async verifyEnrollment(dto, ctx = {}) {
        void ctx;
        const session = await this.findValidSignupSession(dto.token);
        const secretEncrypted = session.pending.totpSecretEncrypted;
        if (!secretEncrypted) {
            throw new common_1.BadRequestException('Start MFA enrollment before verifying the code.');
        }
        const secret = this.decryptSecret(secretEncrypted);
        const verification = (0, otplib_1.verifySync)({
            secret,
            token: dto.code,
            period: 30,
            epochTolerance: 30,
        });
        if (!verification.valid) {
            const failure = await this.failSignupSession(session);
            if (failure.remainingAttempts === 0) {
                throw new common_1.BadRequestException('Too many authenticator verification attempts. Restart setup to continue.');
            }
            throw new common_1.BadRequestException(`Invalid authenticator code. ${failure.remainingAttempts} attempt(s) remaining.`);
        }
        const backupCodes = this.generateBackupCodes();
        const backupCodeHashes = await Promise.all(backupCodes.map((code) => bcrypt.hash(this.normalizeBackupCode(code), this.bcryptRounds())));
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
    async verifyAccountEnrollment(userId, dto, ctx = {}) {
        void ctx;
        const challenge = await this.findValidChallenge(dto.token, client_1.AuthChallengePurpose.SIGNUP_MFA_ENROLL);
        if (challenge.userId !== userId) {
            throw new common_1.UnauthorizedException('MFA setup does not belong to this account.');
        }
        if (challenge.user.mfaEnabled) {
            throw new common_1.BadRequestException('Authenticator app is already enabled for this account.');
        }
        const secretEncrypted = challenge.totpSecretEncrypted;
        if (!secretEncrypted) {
            throw new common_1.BadRequestException('Start MFA setup before verifying the code.');
        }
        const secret = this.decryptSecret(secretEncrypted);
        const verification = (0, otplib_1.verifySync)({
            secret,
            token: dto.code,
            period: 30,
            epochTolerance: 30,
        });
        if (!verification.valid) {
            const failure = await this.failChallenge(challenge);
            if (failure.remainingAttempts === 0) {
                throw new common_1.BadRequestException('Too many authenticator verification attempts. Restart setup to continue.');
            }
            throw new common_1.BadRequestException(`Invalid authenticator code. ${failure.remainingAttempts} attempt(s) remaining.`);
        }
        const backupCodes = this.generateBackupCodes();
        const backupCodeHashes = await Promise.all(backupCodes.map((code) => bcrypt.hash(this.normalizeBackupCode(code), this.bcryptRounds())));
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
                    mfaMethod: client_1.MfaMethod.TOTP,
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
            enabled: true,
            method: 'totp',
            enrolledAt: enrolledAt.toISOString(),
        };
    }
    async regenerateBackupCodes(userId, dto) {
        const user = await this.findActiveUser(userId);
        const secretEncrypted = user.mfaSecretEncrypted;
        if (!user.mfaEnabled || !secretEncrypted) {
            throw new common_1.BadRequestException('Authenticator app is not configured for this account.');
        }
        const secret = this.decryptSecret(secretEncrypted);
        if (!this.isValidTotp(secret, dto.code)) {
            throw new common_1.BadRequestException('Invalid authenticator code.');
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
    async disableAccountMfa(userId, dto) {
        const user = await this.findActiveUser(userId);
        const secretEncrypted = user.mfaSecretEncrypted;
        if (!user.mfaEnabled || !secretEncrypted) {
            throw new common_1.BadRequestException('Authenticator app is not configured for this account.');
        }
        const secret = this.decryptSecret(secretEncrypted);
        if (!this.isValidTotp(secret, dto.code)) {
            throw new common_1.BadRequestException('Invalid authenticator code.');
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
            enabled: false,
            method: null,
            enrolledAt: null,
        };
    }
    async verifyLogin(dto, ctx = {}) {
        const challenge = await this.findValidChallenge(dto.challengeToken, client_1.AuthChallengePurpose.LOGIN_MFA_VERIFY);
        const usingBackupCode = !!dto.backupCode?.trim();
        const usingTotp = !!dto.code?.trim();
        if (!usingBackupCode && !usingTotp) {
            throw new common_1.BadRequestException('Enter an authenticator code or a backup code.');
        }
        let matchedBackupCodeId = null;
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
                    throw new common_1.BadRequestException('Too many MFA attempts. Your account is temporarily locked. Try signing in again later.');
                }
                throw new common_1.BadRequestException(`Invalid backup code. ${failure.remainingAttempts} attempt(s) remaining before lockout.`);
            }
        }
        else {
            const secretEncrypted = challenge.user.mfaSecretEncrypted;
            if (!challenge.user.mfaEnabled || !secretEncrypted) {
                throw new common_1.BadRequestException('Authenticator app is not configured for this account.');
            }
            const secret = this.decryptSecret(secretEncrypted);
            const verification = (0, otplib_1.verifySync)({
                secret,
                token: dto.code ?? '',
                period: 30,
                epochTolerance: 30,
            });
            if (!verification.valid) {
                const failure = await this.failChallenge(challenge);
                if (failure.lockedUntil) {
                    throw new common_1.BadRequestException('Too many MFA attempts. Your account is temporarily locked. Try signing in again later.');
                }
                throw new common_1.BadRequestException(`Invalid authenticator code. ${failure.remainingAttempts} attempt(s) remaining before lockout.`);
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
            const rawToken = (0, crypto_1.randomBytes)(32).toString('base64url');
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
};
exports.MfaService = MfaService;
exports.MfaService = MfaService = MfaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        auth_service_1.AuthService])
], MfaService);
//# sourceMappingURL=mfa.service.js.map