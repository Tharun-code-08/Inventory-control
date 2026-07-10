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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LinkService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkService = exports.waAuthCacheKey = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const ioredis_1 = require("ioredis");
const prisma_service_1 = require("../../../prisma/prisma.service");
const redis_provider_1 = require("../../../common/cache/redis.provider");
const mail_service_1 = require("../../../common/mail/mail.service");
const audit_service_1 = require("../../audit/audit.service");
const notification_service_1 = require("../../notifications/services/notification.service");
const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TOKEN_LENGTH = 8;
const TOKEN_VERSION = 'V1';
const TOKEN_TTL_MS = 10 * 60_000;
const MAX_TOKENS_PER_HOUR = 5;
const MAX_ACTIVE_DEVICES = 5;
const AUTH_CACHE_TTL_S = 300;
const LAST_SEEN_THROTTLE_MS = 5 * 60_000;
const waAuthCacheKey = (phoneNumber) => `wa:auth:${phoneNumber}`;
exports.waAuthCacheKey = waAuthCacheKey;
let LinkService = LinkService_1 = class LinkService {
    prisma;
    audit;
    mail;
    notifications;
    redis;
    logger = new common_1.Logger(LinkService_1.name);
    constructor(prisma, audit, mail, notifications, redis) {
        this.prisma = prisma;
        this.audit = audit;
        this.mail = mail;
        this.notifications = notifications;
        this.redis = redis;
    }
    async generateLinkToken(user, ip, userAgent) {
        if (!user.companyId) {
            throw new common_1.BadRequestException('Your account has no company context; linking is unavailable');
        }
        const recentCount = await this.prisma.whatsAppLinkToken.count({
            where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
        });
        if (recentCount >= MAX_TOKENS_PER_HOUR) {
            throw new common_1.HttpException(`Too many link codes requested. Maximum ${MAX_TOKENS_PER_HOUR} per hour — try again later.`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const rawToken = this.generateToken();
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
        await this.prisma.$transaction([
            this.prisma.whatsAppLinkToken.updateMany({
                where: { userId: user.id, status: client_1.LinkTokenStatus.ACTIVE },
                data: { status: client_1.LinkTokenStatus.EXPIRED },
            }),
            this.prisma.whatsAppLinkToken.create({
                data: {
                    userId: user.id,
                    companyId: user.companyId,
                    tokenHash,
                    tokenVersion: TOKEN_VERSION,
                    expiresAt,
                    generatedIp: ip ?? null,
                    generatedUserAgent: userAgent ?? null,
                },
            }),
        ]);
        await this.audit.logTenant(user, {
            action: client_1.AuditAction.LINK_TOKEN_GENERATED,
            entityType: 'WhatsAppLinkToken',
            ipAddress: ip ?? null,
            userAgent: userAgent ?? null,
            metadata: { expiresAt: expiresAt.toISOString() },
        });
        return {
            token: rawToken,
            expiresAt,
            instructions: `Open WhatsApp and send "LINK ${rawToken}" to the business number within 10 minutes.`,
        };
    }
    async redeemLinkToken(phoneNumber, rawToken) {
        const tokenHash = this.hashToken(this.canonicalizeToken(rawToken));
        const now = new Date();
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const token = await tx.whatsAppLinkToken.findUnique({ where: { tokenHash } });
                if (!token)
                    return { rejected: 'unknown_token' };
                if (token.status === client_1.LinkTokenStatus.USED && token.linkedPhone === phoneNumber) {
                    const device = await tx.whatsAppDevice.findUnique({ where: { phoneNumber } });
                    const link = await tx.userChannelLink.findUnique({
                        where: { channel_phoneNumber: { channel: client_1.ChatChannel.WHATSAPP, phoneNumber } },
                    });
                    return device && link && device.status === client_1.WhatsAppDeviceStatus.ACTIVE
                        ? { device, link, duplicate: true }
                        : { rejected: 'used_token' };
                }
                if (token.status !== client_1.LinkTokenStatus.ACTIVE)
                    return { rejected: 'inactive_token' };
                if (token.expiresAt < now) {
                    await tx.whatsAppLinkToken.update({
                        where: { id: token.id },
                        data: { status: client_1.LinkTokenStatus.EXPIRED },
                    });
                    return { rejected: 'expired_token' };
                }
                const existingDevice = await tx.whatsAppDevice.findUnique({ where: { phoneNumber } });
                if (existingDevice &&
                    existingDevice.status === client_1.WhatsAppDeviceStatus.ACTIVE &&
                    existingDevice.userId !== token.userId) {
                    return { rejected: 'phone_owned_by_other' };
                }
                const activeCount = await tx.whatsAppDevice.count({
                    where: { userId: token.userId, status: client_1.WhatsAppDeviceStatus.ACTIVE },
                });
                const isNewDevice = !existingDevice || existingDevice.status !== client_1.WhatsAppDeviceStatus.ACTIVE;
                if (isNewDevice && activeCount >= MAX_ACTIVE_DEVICES) {
                    return { rejected: 'max_devices' };
                }
                await tx.whatsAppLinkToken.update({
                    where: { id: token.id },
                    data: { status: client_1.LinkTokenStatus.USED, usedAt: now, linkedPhone: phoneNumber },
                });
                const device = existingDevice
                    ? await tx.whatsAppDevice.update({
                        where: { id: existingDevice.id },
                        data: {
                            userId: token.userId,
                            companyId: token.companyId,
                            status: client_1.WhatsAppDeviceStatus.ACTIVE,
                            linkedAt: now,
                            lastSeenAt: now,
                            revokedAt: null,
                            revokedById: null,
                        },
                    })
                    : await tx.whatsAppDevice.create({
                        data: {
                            userId: token.userId,
                            companyId: token.companyId,
                            phoneNumber,
                            lastSeenAt: now,
                        },
                    });
                const link = await tx.userChannelLink.upsert({
                    where: { channel_phoneNumber: { channel: client_1.ChatChannel.WHATSAPP, phoneNumber } },
                    create: {
                        userId: token.userId,
                        companyId: token.companyId,
                        channel: client_1.ChatChannel.WHATSAPP,
                        phoneNumber,
                        status: client_1.ChannelLinkStatus.ACTIVE,
                        verifiedAt: now,
                        lastSeenAt: now,
                    },
                    update: {
                        userId: token.userId,
                        companyId: token.companyId,
                        status: client_1.ChannelLinkStatus.ACTIVE,
                        verifiedAt: now,
                        lastSeenAt: now,
                    },
                });
                return { device, link, token };
            }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
            if ('rejected' in result) {
                await this.audit.log({
                    action: client_1.AuditAction.DEVICE_REJECTED,
                    entityType: 'WhatsAppDevice',
                    metadata: { reason: result.rejected, phoneLast4: phoneNumber.slice(-4) },
                });
                this.logger.debug(`Link redemption rejected (${result.rejected}) for number ending ${phoneNumber.slice(-4)}`);
                return null;
            }
            const { device, link } = result;
            await this.redis.del((0, exports.waAuthCacheKey)(phoneNumber)).catch(() => undefined);
            if (!('duplicate' in result)) {
                await this.audit.log({
                    companyId: device.companyId,
                    userId: device.userId,
                    action: client_1.AuditAction.DEVICE_LINKED,
                    entityType: 'WhatsAppDevice',
                    entityId: device.id,
                    metadata: { phoneLast4: phoneNumber.slice(-4) },
                });
                await this.audit.log({
                    companyId: device.companyId,
                    userId: device.userId,
                    action: client_1.AuditAction.LINK_TOKEN_USED,
                    entityType: 'WhatsAppLinkToken',
                    entityId: 'token' in result ? result.token.id : undefined,
                });
                void this.notifyDeviceLinked(device).catch((err) => this.logger.warn(`Device-linked notification failed: ${err.message}`));
            }
            this.logger.log(`WhatsApp device linked for user ${device.userId}`);
            return { device, link };
        }
        catch (err) {
            this.logger.warn(`Link redemption failed for number ending ${phoneNumber.slice(-4)}: ${err.message}`);
            return null;
        }
    }
    async listDevices(user) {
        const devices = await this.prisma.whatsAppDevice.findMany({
            where: { userId: user.id, status: { not: client_1.WhatsAppDeviceStatus.ARCHIVED } },
            orderBy: { linkedAt: 'desc' },
        });
        return devices.map((d) => ({
            id: d.id,
            phoneNumber: d.phoneNumber,
            nickname: d.nickname,
            deviceType: d.deviceType,
            status: d.status,
            linkedAt: d.linkedAt,
            lastSeenAt: d.lastSeenAt,
        }));
    }
    async renameDevice(user, deviceId, nickname) {
        const device = await this.prisma.whatsAppDevice.findFirst({
            where: { id: deviceId, userId: user.id },
        });
        if (!device)
            throw new common_1.NotFoundException('Device not found');
        return this.prisma.whatsAppDevice.update({
            where: { id: device.id },
            data: { nickname: nickname.trim().slice(0, 50) || null },
        });
    }
    async revokeDevice(user, deviceId) {
        const device = await this.prisma.whatsAppDevice.findFirst({
            where: { id: deviceId, userId: user.id, status: client_1.WhatsAppDeviceStatus.ACTIVE },
        });
        if (!device)
            throw new common_1.NotFoundException('Active device not found');
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.whatsAppDevice.update({
                where: { id: device.id },
                data: { status: client_1.WhatsAppDeviceStatus.REVOKED, revokedAt: now, revokedById: user.id },
            }),
            this.prisma.userChannelLink.updateMany({
                where: {
                    channel: client_1.ChatChannel.WHATSAPP,
                    phoneNumber: device.phoneNumber,
                    status: client_1.ChannelLinkStatus.ACTIVE,
                },
                data: { status: client_1.ChannelLinkStatus.REVOKED },
            }),
        ]);
        await this.redis.del((0, exports.waAuthCacheKey)(device.phoneNumber)).catch(() => undefined);
        await this.audit.logTenant(user, {
            action: client_1.AuditAction.DEVICE_REVOKED,
            entityType: 'WhatsAppDevice',
            entityId: device.id,
            metadata: { phoneLast4: device.phoneNumber.slice(-4) },
        });
        return { revoked: true };
    }
    async getStatus(user) {
        const link = await this.prisma.userChannelLink.findFirst({
            where: { userId: user.id, channel: client_1.ChatChannel.WHATSAPP },
            orderBy: { updatedAt: 'desc' },
        });
        if (!link)
            return { linked: false };
        return {
            linked: link.status === client_1.ChannelLinkStatus.ACTIVE,
            status: link.status,
            phoneNumber: link.phoneNumber,
            verifiedAt: link.verifiedAt,
            lastSeenAt: link.lastSeenAt,
        };
    }
    async unlink(user) {
        const links = await this.prisma.userChannelLink.findMany({
            where: { userId: user.id, channel: client_1.ChatChannel.WHATSAPP, status: client_1.ChannelLinkStatus.ACTIVE },
            select: { phoneNumber: true },
        });
        const now = new Date();
        const [result] = await this.prisma.$transaction([
            this.prisma.userChannelLink.updateMany({
                where: { userId: user.id, channel: client_1.ChatChannel.WHATSAPP, status: client_1.ChannelLinkStatus.ACTIVE },
                data: { status: client_1.ChannelLinkStatus.REVOKED },
            }),
            this.prisma.whatsAppDevice.updateMany({
                where: { userId: user.id, status: client_1.WhatsAppDeviceStatus.ACTIVE },
                data: { status: client_1.WhatsAppDeviceStatus.REVOKED, revokedAt: now, revokedById: user.id },
            }),
        ]);
        for (const { phoneNumber } of links) {
            await this.redis.del((0, exports.waAuthCacheKey)(phoneNumber)).catch(() => undefined);
        }
        return { revoked: result.count > 0 };
    }
    async touchLastSeen(link) {
        const stale = !link.lastSeenAt || Date.now() - link.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS;
        if (!stale)
            return;
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.userChannelLink.update({ where: { id: link.id }, data: { lastSeenAt: now } }),
            this.prisma.whatsAppDevice.updateMany({
                where: { phoneNumber: link.phoneNumber, status: client_1.WhatsAppDeviceStatus.ACTIVE },
                data: { lastSeenAt: now },
            }),
        ]);
    }
    async buildRequestUser(link) {
        const cacheKey = (0, exports.waAuthCacheKey)(link.phoneNumber);
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        catch {
        }
        const user = await this.prisma.user.findUnique({
            where: { id: link.userId },
            include: { role: true, shop: { select: { companyId: true } } },
        });
        if (!user || !user.isActive || user.deletedAt)
            return null;
        const companyId = user.shop?.companyId ?? null;
        let tenantShopIds = [];
        if (companyId) {
            const shops = await this.prisma.shop.findMany({
                where: { companyId },
                select: { id: true },
            });
            tenantShopIds = shops.map((shop) => shop.id);
            if (user.shopId && !tenantShopIds.includes(user.shopId)) {
                tenantShopIds.push(user.shopId);
            }
        }
        else if (user.shopId) {
            tenantShopIds = [user.shopId];
        }
        const requestUser = {
            id: user.id,
            email: user.email,
            role: user.role.name,
            shopId: user.shopId,
            companyId,
            tenantShopIds,
            permissions: user.role.permissions,
        };
        try {
            await this.redis.set(cacheKey, JSON.stringify(requestUser), 'EX', AUTH_CACHE_TTL_S);
        }
        catch {
        }
        return requestUser;
    }
    async expireStaleTokens() {
        const result = await this.prisma.whatsAppLinkToken.updateMany({
            where: { status: client_1.LinkTokenStatus.ACTIVE, expiresAt: { lt: new Date() } },
            data: { status: client_1.LinkTokenStatus.EXPIRED },
        });
        return result.count;
    }
    async purgeOldTokens() {
        const cutoff = new Date(Date.now() - 30 * 24 * 3_600_000);
        const result = await this.prisma.whatsAppLinkToken.deleteMany({
            where: { status: { not: client_1.LinkTokenStatus.ACTIVE }, createdAt: { lt: cutoff } },
        });
        return result.count;
    }
    async notifyDeviceLinked(device) {
        const user = await this.prisma.user.findUnique({
            where: { id: device.userId },
            select: { email: true, name: true },
        });
        if (!user)
            return;
        const masked = `+${device.phoneNumber.slice(0, -4).replace(/\d/g, 'X')}${device.phoneNumber.slice(-4)}`;
        const when = device.linkedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        await this.notifications.create({
            userId: device.userId,
            title: 'New WhatsApp device linked',
            message: `WhatsApp number ${masked} is now linked to your account and can use the AI assistant.`,
            type: client_1.AlertType.NEW_DEVICE_LOGIN,
            priority: client_1.NotificationPriority.HIGH,
            module: client_1.NotificationModule.SECURITY,
            referenceType: 'WhatsAppDevice',
            referenceId: device.id,
        }, null, device.companyId);
        await this.mail.sendPlatformMail({
            to: user.email,
            subject: 'New WhatsApp device linked to your account',
            text: `Hi ${user.name ?? ''},\n\nA new WhatsApp device was linked to your account.\n\n` +
                `Phone: ${masked}\nTime: ${when}\n\n` +
                `If this wasn't you, remove the device immediately from Settings → WhatsApp AI.`,
            html: `<p>Hi ${user.name ?? ''},</p><p>A new WhatsApp device was linked to your account.</p>` +
                `<p><strong>Phone:</strong> ${masked}<br/><strong>Time:</strong> ${when}</p>` +
                `<p>If this wasn't you, remove the device immediately from <strong>Settings → WhatsApp AI</strong>.</p>`,
        });
    }
    generateToken() {
        let body = '';
        for (let i = 0; i < TOKEN_LENGTH; i += 1) {
            body += TOKEN_ALPHABET[(0, crypto_1.randomInt)(TOKEN_ALPHABET.length)];
        }
        return `${TOKEN_VERSION}-${body}`;
    }
    canonicalizeToken(raw) {
        const upper = raw.trim().toUpperCase();
        return upper.startsWith(`${TOKEN_VERSION}-`) ? upper : `${TOKEN_VERSION}-${upper}`;
    }
    hashToken(canonicalToken) {
        return (0, crypto_1.createHash)('sha256').update(canonicalToken).digest('hex');
    }
};
exports.LinkService = LinkService;
exports.LinkService = LinkService = LinkService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(redis_provider_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        mail_service_1.MailService,
        notification_service_1.NotificationService,
        ioredis_1.default])
], LinkService);
//# sourceMappingURL=link.service.js.map