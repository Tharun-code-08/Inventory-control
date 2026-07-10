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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const redis_provider_1 = require("../../common/cache/redis.provider");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const assert_company_id_1 = require("../../common/utils/assert-company-id");
const mail_service_1 = require("../../common/mail/mail.service");
const portal_url_1 = require("../../common/mail/portal-url");
const shop_scope_1 = require("../../common/utils/shop-scope");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const subscription_service_1 = require("../billing/subscription.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
let UsersService = class UsersService {
    prisma;
    config;
    audit;
    mail;
    subscriptions;
    emailNotifications;
    redis;
    constructor(prisma, config, audit, mail, subscriptions, emailNotifications, redis) {
        this.prisma = prisma;
        this.config = config;
        this.audit = audit;
        this.mail = mail;
        this.subscriptions = subscriptions;
        this.emailNotifications = emailNotifications;
        this.redis = redis;
    }
    async invalidateWhatsAppAuthCache(userId) {
        try {
            const links = await this.prisma.userChannelLink.findMany({
                where: { userId, channel: client_1.ChatChannel.WHATSAPP, status: client_1.ChannelLinkStatus.ACTIVE },
                select: { phoneNumber: true },
            });
            if (links.length === 0)
                return;
            await this.redis.del(...links.map((l) => `wa:auth:${l.phoneNumber}`));
        }
        catch {
        }
    }
    bcryptRounds() {
        const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
        return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
    }
    isOwner(user) {
        return user.role === client_1.RoleName.OWNER;
    }
    isOrgAdmin(user) {
        return user.role === client_1.RoleName.OWNER || user.role === client_1.RoleName.ADMIN;
    }
    isAdmin(user) {
        return this.isOrgAdmin(user);
    }
    assertCanManageShop(actor, targetShopId) {
        if (targetShopId) {
            (0, shop_scope_1.assertUserInTenant)(actor, targetShopId);
            return;
        }
        if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
            throw new common_1.ForbiddenException('Operation requires a shop in your organisation');
        }
    }
    normalizeRoleName(roleName) {
        const normalized = roleName.toUpperCase().trim();
        const aliasMap = {
            SHOP_MANAGER: client_1.RoleName.INVENTORY_MANAGER,
            SHOP_STAFF: client_1.RoleName.WAREHOUSE_STAFF,
            WAREHOUSE_STAFF: client_1.RoleName.WAREHOUSE_STAFF,
            PURCHASE_MANAGER: client_1.RoleName.PURCHASE_MANAGER,
            SALES: client_1.RoleName.SALES,
            EMPLOYEE: client_1.RoleName.EMPLOYEE,
            VIEWER: client_1.RoleName.VIEWER,
            VENDOR: client_1.RoleName.VENDOR,
            OWNER: client_1.RoleName.OWNER,
        };
        if (normalized === 'SHOP_USER')
            return client_1.RoleName.WAREHOUSE_STAFF;
        return aliasMap[normalized] ?? normalized;
    }
    inviteTtlMs() {
        const hours = Number(this.config.get('INVITE_TTL_HOURS') ?? 72);
        return Math.max(1, hours) * 60 * 60 * 1000;
    }
    async resolveRoleId(roleIdOrName) {
        const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidLike.test(roleIdOrName))
            return roleIdOrName;
        const targetName = this.normalizeRoleName(roleIdOrName);
        const role = await this.prisma.role.findFirst({ where: { name: targetName } });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        return role.id;
    }
    async assertRoleAssignable(actor, roleId) {
        const role = await this.prisma.role.findUnique({ where: { id: roleId } });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        if (role.name === client_1.RoleName.OWNER) {
            if (!this.isOwner(actor)) {
                throw new common_1.ForbiddenException('Only the organisation owner can assign the Owner role');
            }
            return;
        }
        if (role.name === client_1.RoleName.ADMIN) {
            if (!this.isOrgAdmin(actor)) {
                throw new common_1.ForbiddenException('Only an administrator can assign the Admin role');
            }
            return;
        }
        if (!this.isOrgAdmin(actor)) {
            throw new common_1.ForbiddenException('Insufficient privileges to assign this role');
        }
    }
    async listRoles() {
        return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    }
    async updateRolePermissions(actor, roleName, permissions) {
        if (!this.isOrgAdmin(actor)) {
            throw new common_1.ForbiddenException('Only an administrator can edit role permissions');
        }
        const targetName = this.normalizeRoleName(roleName);
        const role = await this.prisma.role.findFirst({ where: { name: targetName } });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        const updated = await this.prisma.role.update({
            where: { id: role.id },
            data: { permissions },
        });
        await this.audit.log({
            userId: actor.id,
            companyId: (0, assert_company_id_1.assertCompanyId)(actor),
            action: client_1.AuditAction.UPDATE,
            entityType: 'ROLE',
            entityId: role.id,
            oldValues: { permissions: role.permissions },
            newValues: { permissions },
        });
        return updated;
    }
    resolveShopForActor(actor, requestedShopId) {
        if (requestedShopId !== undefined) {
            this.assertCanManageShop(actor, requestedShopId);
            return requestedShopId ?? null;
        }
        const tenantShops = (0, shop_scope_1.shopIdsForUser)(actor);
        if (tenantShops && tenantShops.length > 0) {
            return actor.shopId ?? tenantShops[0];
        }
        if (actor.shopId) {
            return actor.shopId;
        }
        return null;
    }
    async list(actor) {
        return this.prisma.user.findMany({
            where: (0, shop_scope_1.userListWhere)(actor),
            orderBy: { createdAt: 'desc' },
            include: { role: true, shop: true },
        });
    }
    async create(actor, dto) {
        const resolvedShopId = this.resolveShopForActor(actor, dto.shopId);
        dto = { ...dto, shopId: resolvedShopId };
        if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
            if (!dto.shopId || !actor.tenantShopIds.includes(dto.shopId)) {
                throw new common_1.ForbiddenException('User must belong to your organisation');
            }
        }
        const exists = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase().trim() },
        });
        if (exists)
            throw new common_1.ConflictException('Email already in use');
        const roleId = await this.resolveRoleId(dto.roleId);
        await this.assertRoleAssignable(actor, roleId);
        const companyId = await this.subscriptions.resolveCompanyIdForUser(actor);
        if (companyId) {
            await this.subscriptions.assertUserLimit(companyId);
        }
        const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
        const created = await this.prisma.user.create({
            data: {
                name: dto.name.trim(),
                email: dto.email.toLowerCase().trim(),
                passwordHash,
                roleId,
                shopId: dto.shopId ?? null,
                isActive: dto.isActive ?? true,
            },
            include: { role: true, shop: true },
        });
        await this.audit.log({
            userId: actor.id,
            companyId: (0, assert_company_id_1.assertCompanyId)(actor),
            action: client_1.AuditAction.CREATE,
            entityType: 'USER',
            entityId: created.id,
            newValues: {
                email: created.email,
                roleId: created.roleId,
                shopId: created.shopId,
                isActive: created.isActive,
            },
        });
        return created;
    }
    async invite(actor, dto) {
        const email = dto.email.toLowerCase().trim();
        const inviter = await this.prisma.user.findUnique({
            where: { id: actor.id },
            include: { shop: { include: { company: true } } },
        });
        const exists = await this.prisma.user.findUnique({
            where: { email },
        });
        if (exists)
            throw new common_1.ConflictException('Email already in use');
        const roleId = await this.resolveRoleId(dto.roleId);
        await this.assertRoleAssignable(actor, roleId);
        const shopId = this.resolveShopForActor(actor, dto.shopId);
        if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
            if (shopId && !actor.tenantShopIds.includes(shopId)) {
                throw new common_1.ForbiddenException('User must belong to your organisation');
            }
        }
        const token = (0, crypto_1.randomBytes)(32).toString('base64url');
        const tokenHash = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + this.inviteTtlMs());
        const invitation = await this.prisma.$transaction(async (tx) => {
            await tx.userInvitation.updateMany({
                where: { email, consumedAt: null },
                data: { consumedAt: new Date() },
            });
            return tx.userInvitation.create({
                data: {
                    email,
                    name: dto.name?.trim(),
                    roleId,
                    shopId,
                    tokenHash,
                    invitedById: actor.id,
                    expiresAt,
                },
                include: {
                    role: true,
                    shop: { include: { company: true } },
                },
            });
        });
        const inviteUrl = (0, portal_url_1.buildUserInviteAcceptUrl)(this.config, token);
        const companyName = invitation.shop?.company?.companyName ??
            inviter?.shop?.company?.companyName ??
            'SoftdigitIMS';
        const mailContent = {
            inviteUrl,
            companyName,
            inviteeEmail: email,
            inviteeName: dto.name,
            inviterName: inviter?.name ?? inviter?.email ?? 'Admin',
            roleName: invitation.role.name,
            shopName: invitation.shop?.shopName,
            expiresHours: Math.round(this.inviteTtlMs() / (60 * 60 * 1000)),
        };
        try {
            const defaults = (0, email_notifications_outbound_1.userInviteDefaults)(mailContent);
            const prepared = await this.emailNotifications.prepareTemplateForShop(invitation.shopId, 'user_invite', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
            if (!prepared.enabled) {
                throw new common_1.BadRequestException('User invitation emails are disabled in settings.');
            }
            const companyId = invitation.shop?.companyId ?? actor.companyId;
            if (!companyId) {
                throw new common_1.BadRequestException('Invitation is not linked to a company');
            }
            await this.mail.sendTenantMail(companyId, {
                to: email,
                subject: prepared.subject,
                text: prepared.text,
                html: prepared.html,
                cc: prepared.cc,
                bcc: prepared.bcc,
                fromName: companyName,
            });
        }
        catch (err) {
            throw new common_1.ServiceUnavailableException(err.message || 'Email delivery is not configured. Please check SMTP settings.');
        }
        await this.audit.logTenant(actor, {
            action: client_1.AuditAction.CREATE,
            entityType: 'USER_INVITATION',
            entityId: invitation.id,
            newValues: { email, roleId, shopId, expiresAt },
        });
        return { ok: true, email, expiresAt };
    }
    async get(actor, id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true, shop: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        this.assertCanManageShop(actor, user.shopId);
        return user;
    }
    async update(actor, id, dto) {
        const existing = await this.get(actor, id);
        if (dto.shopId !== undefined) {
            this.assertCanManageShop(actor, dto.shopId);
            if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
                if (!dto.shopId || !actor.tenantShopIds.includes(dto.shopId)) {
                    throw new common_1.ForbiddenException('User must belong to your organisation');
                }
            }
        }
        let resolvedRoleId;
        if (dto.roleId) {
            resolvedRoleId = await this.resolveRoleId(dto.roleId);
            await this.assertRoleAssignable(actor, resolvedRoleId);
        }
        if (dto.email) {
            const exists = await this.prisma.user.findFirst({
                where: { email: dto.email.toLowerCase().trim(), id: { not: id } },
            });
            if (exists)
                throw new common_1.ConflictException('Email already in use');
        }
        const passwordHash = dto.password ? await bcrypt.hash(dto.password, this.bcryptRounds()) : undefined;
        const passwordChangedAt = dto.password ? new Date() : undefined;
        const updated = await this.prisma.$transaction(async (tx) => {
            const nextUser = await tx.user.update({
                where: { id },
                data: {
                    name: dto.name?.trim(),
                    email: dto.email ? dto.email.toLowerCase().trim() : undefined,
                    passwordHash,
                    passwordChangedAt,
                    roleId: resolvedRoleId,
                    shopId: dto.shopId === null ? null : dto.shopId,
                    isActive: dto.isActive,
                    failedLoginCount: dto.password ? 0 : undefined,
                    lockedUntil: dto.password ? null : undefined,
                },
                include: { role: true, shop: true },
            });
            if (dto.password) {
                await tx.session.updateMany({
                    where: { userId: id, revokedAt: null },
                    data: { revokedAt: passwordChangedAt ?? new Date() },
                });
                await tx.trustedMfaDevice.updateMany({
                    where: { userId: id, revokedAt: null },
                    data: { revokedAt: passwordChangedAt ?? new Date() },
                });
            }
            return nextUser;
        });
        if (updated.roleId !== existing.roleId || updated.isActive !== existing.isActive) {
            await this.invalidateWhatsAppAuthCache(id);
        }
        await this.audit.log({
            userId: actor.id,
            companyId: (0, assert_company_id_1.assertCompanyId)(actor),
            action: client_1.AuditAction.UPDATE,
            entityType: 'USER',
            entityId: existing.id,
            oldValues: {
                email: existing.email,
                roleId: existing.roleId,
                shopId: existing.shopId,
                isActive: existing.isActive,
            },
            newValues: {
                email: updated.email,
                roleId: updated.roleId,
                shopId: updated.shopId,
                isActive: updated.isActive,
                passwordChanged: !!dto.password,
            },
        });
        return updated;
    }
    async remove(actor, id) {
        const existing = await this.get(actor, id);
        if (existing.id === actor.id) {
            throw new common_1.BadRequestException('You cannot disable your own account');
        }
        if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
            if (!existing.shopId || !actor.tenantShopIds.includes(existing.shopId)) {
                throw new common_1.ForbiddenException('User is outside your organisation');
            }
        }
        await this.prisma.user.update({
            where: { id },
            data: { isActive: false, deletedAt: new Date() },
        });
        await this.invalidateWhatsAppAuthCache(id);
        await this.audit.log({
            userId: actor.id,
            companyId: (0, assert_company_id_1.assertCompanyId)(actor),
            action: client_1.AuditAction.UPDATE,
            entityType: 'USER',
            entityId: existing.id,
            oldValues: { isActive: existing.isActive, deletedAt: null },
            newValues: { isActive: false, deletedAt: new Date().toISOString() },
        });
        return { ok: true };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, common_1.Inject)(redis_provider_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        audit_service_1.AuditService,
        mail_service_1.MailService,
        subscription_service_1.SubscriptionService,
        email_notifications_service_1.EmailNotificationsService,
        ioredis_1.default])
], UsersService);
//# sourceMappingURL=users.service.js.map