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
var InviteService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const undici_1 = require("undici");
const prisma_service_1 = require("../../prisma/prisma.service");
const auth_service_1 = require("./auth.service");
let InviteService = InviteService_1 = class InviteService {
    prisma;
    config;
    auth;
    logger = new common_1.Logger(InviteService_1.name);
    constructor(prisma, config, auth) {
        this.prisma = prisma;
        this.config = config;
        this.auth = auth;
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    bcryptRounds() {
        const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
        return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
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
                this.logger.warn(`Turnstile verification failed: ${JSON.stringify(payload['error-codes'] ?? [])}`);
                throw new common_1.BadRequestException('Captcha verification failed. Please try again.');
            }
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException || err instanceof common_1.ServiceUnavailableException) {
                throw err;
            }
            this.logger.error(`Turnstile verify error: ${err.message}`);
            throw new common_1.ServiceUnavailableException('Captcha verification is unavailable. Try again.');
        }
    }
    async findValidInvite(token) {
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
            throw new common_1.BadRequestException('Invalid or expired invitation link.');
        }
        return invite;
    }
    async preview(token) {
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
    async accept(dto, ctx) {
        const invite = await this.findValidInvite(dto.token);
        const existing = await this.prisma.user.findUnique({
            where: { email: invite.email },
        });
        if (existing) {
            throw new common_1.ConflictException('An account with this email already exists. Please sign in.');
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
};
exports.InviteService = InviteService;
exports.InviteService = InviteService = InviteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        auth_service_1.AuthService])
], InviteService);
//# sourceMappingURL=invite.service.js.map