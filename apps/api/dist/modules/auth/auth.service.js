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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwt;
    config;
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    toSessionUser(user) {
        const permissions = user.role.permissions;
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.name,
            shopId: user.shopId,
            permissions,
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
                }
                : null,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase().trim() },
            include: { role: true, shop: true },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        let passwordOk = false;
        try {
            passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
        }
        catch {
            passwordOk = false;
        }
        if (!passwordOk) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const accessToken = await this.jwt.signAsync({
            sub: user.id,
            email: user.email,
            role: String(user.role.name),
        });
        const refreshId = (0, crypto_1.randomUUID)();
        const refreshTokenHash = await bcrypt.hash(refreshId, 10);
        const refreshTtl = this.config.get('JWT_REFRESH_EXPIRES', '7d');
        const refreshToken = await this.jwt.signAsync({ sub: user.id, refreshId }, {
            secret: this.config.getOrThrow('REFRESH_SECRET'),
            expiresIn: refreshTtl,
        });
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash, lastLoginAt: new Date() },
        });
        return {
            accessToken,
            refreshCookieValue: refreshToken,
            user: this.toSessionUser(user),
        };
    }
    async refreshFromToken(refreshToken) {
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
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { role: true, shop: true },
        });
        if (!user || !user.isActive || !user.refreshTokenHash) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const matches = await bcrypt.compare(payload.refreshId, user.refreshTokenHash);
        if (!matches) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const newRefreshId = (0, crypto_1.randomUUID)();
        const newHash = await bcrypt.hash(newRefreshId, 10);
        const newRefreshToken = await this.jwt.signAsync({ sub: user.id, refreshId: newRefreshId }, {
            secret: this.config.getOrThrow('REFRESH_SECRET'),
            expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
        });
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: newHash },
        });
        const accessToken = await this.jwt.signAsync({
            sub: user.id,
            email: user.email,
            role: String(user.role.name),
        });
        return {
            accessToken,
            refreshCookieValue: newRefreshToken,
            user: this.toSessionUser(user),
        };
    }
    async logout(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: null },
        });
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
        const nextAvatarUrl = avatar ? `/uploads/avatars/${userId}-${Date.now()}.${(avatar.originalname.split('.').pop() || 'png').toLowerCase()}` : undefined;
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
        const newHash = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash, refreshTokenHash: null },
        });
        return { ok: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map