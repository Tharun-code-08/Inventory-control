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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const avatar_storage_service_1 = require("../../common/upload/avatar-storage.service");
const audit_service_1 = require("../audit/audit.service");
const attempt_source_enum_1 = require("../../common/enums/attempt-source.enum");
const audit_reason_enum_1 = require("../../common/enums/audit-reason.enum");
const platform_admin_util_1 = require("../platform/platform-admin.util");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwt;
    config;
    avatarStorage;
    audit;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwt, config, avatarStorage, audit) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.avatarStorage = avatarStorage;
        this.audit = audit;
    }
    bcryptRounds() {
        const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
        return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
    }
    lockoutThreshold() {
        return Number(this.config.get('LOCKOUT_THRESHOLD') ?? 5);
    }
    lockoutDurationMs() {
        return Number(this.config.get('LOCKOUT_DURATION_MIN') ?? 15) * 60 * 1000;
    }
    lockoutUntilForFailures(nextFailedCount) {
        const threshold = this.lockoutThreshold();
        const severity = Math.max(1, nextFailedCount - threshold + 1);
        const multiplier = Math.min(8, 2 ** (severity - 1));
        return new Date(Date.now() + this.lockoutDurationMs() * multiplier);
    }
    toSessionUser(user) {
        const permissions = user.role.permissions;
        const allowlist = (0, platform_admin_util_1.parsePlatformAdminEmailsFromConfig)(this.config);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.name,
            shopId: user.shopId,
            companyId: user.shop?.companyId ?? null,
            permissions,
            isPlatformAdmin: (0, platform_admin_util_1.isPlatformAdminEmail)(user.email, allowlist),
            avatarUrl: user.avatarUrl,
            shop: user.shop
                ? {
                    id: user.shop.id,
                    shopNumber: user.shop.shopNumber,
                    shopName: user.shop.shopName,
                    address: user.shop.address,
                    contactPerson: user.shop.contactPerson,
                    mobile: user.shop.mobile,
                    email: user.shop.email,
                    isActive: user.shop.isActive,
                    companyId: user.shop.companyId,
                }
                : null,
        };
    }
    refreshTtl() {
        return this.config.get('JWT_REFRESH_EXPIRES', '7d');
    }
    refreshTtlMs() {
        const raw = this.config.get('JWT_REFRESH_EXPIRES', '7d');
        const match = /^(\d+)([mhd])$/.exec(raw.trim());
        if (!match)
            return 7 * 24 * 60 * 60 * 1000;
        const [, n, unit] = match;
        const ms = unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
        return Number(n) * ms;
    }
    passwordVersion(passwordChangedAt) {
        return passwordChangedAt ? passwordChangedAt.toISOString() : undefined;
    }
    async signAccessToken(args) {
        const payload = {
            sub: args.userId,
            email: args.email,
            role: args.roleName,
        };
        const pwd = this.passwordVersion(args.passwordChangedAt);
        if (pwd)
            payload.pwd = pwd;
        return this.jwt.signAsync(payload);
    }
    async issueSession(userId, ctx) {
        const refreshId = (0, crypto_1.randomUUID)();
        const refreshHash = await bcrypt.hash(refreshId, this.bcryptRounds());
        const session = await this.prisma.session.create({
            data: {
                userId,
                refreshHash,
                ip: ctx.ip ?? null,
                userAgent: ctx.userAgent?.slice(0, 512) ?? null,
                expiresAt: new Date(Date.now() + this.refreshTtlMs()),
            },
        });
        const refreshToken = await this.jwt.signAsync({ sub: userId, sid: session.id, refreshId }, {
            secret: this.config.getOrThrow('REFRESH_SECRET'),
            expiresIn: this.refreshTtl(),
        });
        return { sessionId: session.id, refreshToken };
    }
    async validateCredentials(dto, ctx = {}) {
        const email = dto.email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { role: true, shop: true },
        });
        const generic = 'Invalid credentials or account temporarily locked';
        if (!user || !user.isActive) {
            this.logger.log(JSON.stringify({
                requestId: ctx.requestId,
                event: 'LOGIN_FAILED',
                reason: 'USER_NOT_FOUND',
                email,
            }));
            throw new common_1.UnauthorizedException(generic);
        }
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            const companyId = user.shop?.companyId;
            if (companyId) {
                await this.audit.log({
                    companyId,
                    userId: user.id,
                    action: client_1.AuditAction.LOGIN_FAILED,
                    reason: audit_reason_enum_1.AuditReason.ACCOUNT_LOCKED,
                    ipAddress: ctx.ip ?? null,
                    userAgent: ctx.userAgent ?? null,
                    metadata: {
                        email,
                        attemptSource: attempt_source_enum_1.AttemptSource.MOBILE,
                    },
                    requestId: ctx.requestId,
                });
            }
            this.logger.log(JSON.stringify({
                requestId: ctx.requestId,
                event: 'LOGIN_FAILED',
                reason: 'ACCOUNT_LOCKED',
                userId: user.id,
            }));
            throw new common_1.UnauthorizedException(generic);
        }
        let passwordOk = false;
        try {
            passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
        }
        catch (err) {
            this.logger.warn(`bcrypt.compare failed for userId=${user.id}: ${err?.message ?? 'unknown'}`);
            passwordOk = false;
        }
        if (!passwordOk) {
            const threshold = this.lockoutThreshold();
            await this.prisma.$transaction(async (tx) => {
                const afterIncrement = await tx.user.update({
                    where: { id: user.id },
                    data: { failedLoginCount: { increment: 1 } },
                    select: { failedLoginCount: true },
                });
                if (afterIncrement.failedLoginCount >= threshold) {
                    await tx.user.update({
                        where: { id: user.id },
                        data: {
                            lockedUntil: this.lockoutUntilForFailures(afterIncrement.failedLoginCount),
                        },
                    });
                }
            });
            const companyId = user.shop?.companyId;
            if (companyId) {
                await this.audit.log({
                    companyId,
                    userId: user.id,
                    action: client_1.AuditAction.LOGIN_FAILED,
                    reason: audit_reason_enum_1.AuditReason.INVALID_PASSWORD,
                    ipAddress: ctx.ip ?? null,
                    userAgent: ctx.userAgent ?? null,
                    metadata: {
                        email,
                        attemptSource: attempt_source_enum_1.AttemptSource.MOBILE,
                    },
                    requestId: ctx.requestId,
                });
            }
            this.logger.log(JSON.stringify({
                requestId: ctx.requestId,
                event: 'LOGIN_FAILED',
                reason: 'INVALID_PASSWORD',
                userId: user.id,
            }));
            throw new common_1.UnauthorizedException(generic);
        }
        if (user.failedLoginCount > 0 || user.lockedUntil) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { failedLoginCount: 0, lockedUntil: null },
            });
        }
        return user;
    }
    async lockAccountForMfa(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { failedLoginCount: true, isActive: true },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Account is not active');
        }
        const nextFailedCount = Math.max(user.failedLoginCount, this.lockoutThreshold());
        const lockedUntil = this.lockoutUntilForFailures(nextFailedCount);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginCount: nextFailedCount,
                lockedUntil,
            },
        });
        return lockedUntil;
    }
    async login(dto, ctx = {}) {
        const user = await this.validateCredentials(dto, ctx);
        return this.issueSessionForUser(user.id, ctx);
    }
    async refreshFromToken(refreshToken, ctx = {}) {
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Missing refresh token');
        }
        let payload;
        try {
            payload = await this.jwt.verifyAsync(refreshToken, {
                secret: this.config.getOrThrow('REFRESH_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
        if (!session || session.userId !== payload.sub || session.revokedAt) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
            throw new common_1.UnauthorizedException('Refresh token expired');
        }
        const matches = await bcrypt.compare(payload.refreshId, session.refreshHash);
        if (!matches) {
            await this.prisma.session.updateMany({
                where: { userId: session.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: session.userId },
            include: { role: true, shop: true },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const newRefreshId = (0, crypto_1.randomUUID)();
        const newRefreshHash = await bcrypt.hash(newRefreshId, this.bcryptRounds());
        const rotated = await this.prisma.session.updateMany({
            where: { id: session.id, refreshHash: session.refreshHash, revokedAt: null },
            data: {
                refreshHash: newRefreshHash,
                lastSeenAt: new Date(),
                ip: ctx.ip ?? session.ip,
                userAgent: ctx.userAgent?.slice(0, 512) ?? session.userAgent,
            },
        });
        if (rotated.count === 0) {
            await this.prisma.session.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            });
            throw new common_1.UnauthorizedException('Refresh token already used');
        }
        const accessToken = await this.signAccessToken({
            userId: user.id,
            email: user.email,
            roleName: String(user.role.name),
            passwordChangedAt: user.passwordChangedAt,
        });
        const newRefreshToken = await this.jwt.signAsync({ sub: user.id, sid: session.id, refreshId: newRefreshId }, {
            secret: this.config.getOrThrow('REFRESH_SECRET'),
            expiresIn: this.refreshTtl(),
        });
        return {
            accessToken,
            refreshCookieValue: newRefreshToken,
            sessionId: session.id,
            user: this.toSessionUser(user),
        };
    }
    async getSessionIdFromRefreshToken(refreshToken) {
        if (!refreshToken)
            return null;
        try {
            const payload = await this.jwt.verifyAsync(refreshToken, {
                secret: this.config.getOrThrow('REFRESH_SECRET'),
            });
            return payload.sid ?? null;
        }
        catch {
            return null;
        }
    }
    async logout(userId, sessionId) {
        if (sessionId) {
            await this.prisma.session.updateMany({
                where: { id: sessionId, userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            return;
        }
        await this.prisma.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async listSessions(userId) {
        const rows = await this.prisma.session.findMany({
            where: { userId, revokedAt: null },
            orderBy: { lastSeenAt: 'desc' },
            select: {
                id: true,
                ip: true,
                userAgent: true,
                createdAt: true,
                lastSeenAt: true,
                expiresAt: true,
            },
        });
        return rows;
    }
    async revokeSession(userId, sessionId, isAdmin) {
        const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        if (session.userId !== userId && !isAdmin) {
            throw new common_1.ForbiddenException('Cannot revoke another user session');
        }
        await this.prisma.session.update({
            where: { id: sessionId },
            data: { revokedAt: new Date() },
        });
        return { ok: true };
    }
    async revokeAllForUser(userId) {
        const result = await this.prisma.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return { revoked: result.count };
    }
    async me(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true, shop: true },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException();
        }
        return this.toSessionUser(user);
    }
    async updateProfile(userId, dto, avatar) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true, shop: true },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException();
        }
        const nextName = dto.name?.trim() || undefined;
        const nextShopName = dto.shopName?.trim() || undefined;
        const nextAvatarUrl = avatar ? await this.avatarStorage.store(userId, avatar) : undefined;
        const hasChange = !!(nextName || nextShopName || avatar);
        if (!hasChange) {
            return this.me(userId);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const userData = {};
            if (nextName)
                userData.name = nextName;
            if (nextAvatarUrl)
                userData.avatarUrl = nextAvatarUrl;
            if (Object.keys(userData).length > 0) {
                await tx.user.update({ where: { id: userId }, data: userData });
            }
            if (nextShopName && user.shopId) {
                await tx.shop.update({
                    where: { id: user.shopId },
                    data: { shopName: nextShopName, updatedById: userId },
                });
            }
            return tx.user.findUnique({
                where: { id: userId },
                include: { role: true, shop: true },
            });
        });
        if (!updated) {
            throw new common_1.UnauthorizedException();
        }
        return this.toSessionUser(updated);
    }
    async updatePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException();
        }
        const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!ok) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        await this.forceResetPassword(userId, dto.newPassword);
        return { ok: true };
    }
    async forceResetPassword(userId, nextPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Account is not active');
        }
        const newHash = await bcrypt.hash(nextPassword, this.bcryptRounds());
        const passwordChangedAt = new Date();
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    passwordHash: newHash,
                    passwordChangedAt,
                    failedLoginCount: 0,
                    lockedUntil: null,
                },
            }),
            this.prisma.session.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: passwordChangedAt },
            }),
            this.prisma.trustedMfaDevice.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: passwordChangedAt },
            }),
        ]);
        return { ok: true, passwordChangedAt };
    }
    async issueSessionForUser(userId, ctx = {}) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true, shop: true },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Account is not active');
        }
        const accessToken = await this.signAccessToken({
            userId: user.id,
            email: user.email,
            roleName: String(user.role.name),
            passwordChangedAt: user.passwordChangedAt,
        });
        const companyId = user.shop?.companyId;
        if (!companyId) {
            throw new common_1.UnauthorizedException('User shop or company not properly configured');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const session = await this.issueSession(user.id, ctx);
            await tx.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
            });
            await this.audit.log({
                companyId,
                userId: user.id,
                action: client_1.AuditAction.LOGIN,
                ipAddress: ctx.ip ?? null,
                userAgent: ctx.userAgent ?? null,
                deviceId: ctx.deviceId ?? null,
                metadata: {
                    attemptSource: attempt_source_enum_1.AttemptSource.MOBILE,
                },
                requestId: ctx.requestId,
            }, tx);
            return session;
        });
        this.logger.log(JSON.stringify({
            requestId: ctx.requestId,
            event: 'LOGIN_SUCCESS',
            userId: user.id,
            companyId: user.shop?.companyId,
        }));
        return {
            accessToken,
            refreshCookieValue: result.refreshToken,
            sessionId: result.sessionId,
            user: this.toSessionUser(user),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        avatar_storage_service_1.AvatarStorageService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map