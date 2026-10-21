import { AuditAction, ChannelLinkStatus, ChatChannel, RoleName } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/cache/redis.provider';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import type { RequestUser } from '../../common/types/request-user';
import { assertCompanyId } from '../../common/utils/assert-company-id';
import {
  LOCKED_ROLES,
  assertValidPermissions,
  loadRolePermissionOverrides,
  rolePermissionsKey,
} from '../../common/auth/role-permissions';
import { MailService } from '../../common/mail/mail.service';
import { type UserInviteEmailContent } from '../../common/mail/user-invite.template';
import { buildUserInviteAcceptUrl } from '../../common/mail/portal-url';
import { assertUserInTenant, shopIdsForUser, userListWhere } from '../../common/utils/shop-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionService } from '../billing/subscription.service';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { userInviteDefaults } from '../email-notifications/email-notifications.outbound';

/** Credential columns that must never leave the API. */
const USER_SECRET_FIELDS = {
  passwordHash: true,
  refreshTokenHash: true,
  mfaSecretEncrypted: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly subscriptions: SubscriptionService,
    private readonly emailNotifications: EmailNotificationsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * WhatsApp-agent auth is cached per phone number (wa:auth:*, 5-min TTL).
   * Any change to role/active state must drop those keys so the very next
   * message re-loads permissions instead of riding out the TTL.
   */
  private async invalidateWhatsAppAuthCache(userId: string): Promise<void> {
    try {
      const links = await this.prisma.userChannelLink.findMany({
        where: { userId, channel: ChatChannel.WHATSAPP, status: ChannelLinkStatus.ACTIVE },
        select: { phoneNumber: true },
      });
      if (links.length === 0) return;
      await this.redis.del(...links.map((l) => `wa:auth:${l.phoneNumber}`));
    } catch {
      // Cache invalidation is best-effort; the 5-min TTL bounds staleness.
    }
  }

  private bcryptRounds() {
    const value = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
  }

  private isOwner(user: RequestUser) {
    return user.role === RoleName.OWNER;
  }

  private isOrgAdmin(user: RequestUser) {
    return user.role === RoleName.OWNER || user.role === RoleName.ADMIN;
  }

  private isAdmin(user: RequestUser) {
    return this.isOrgAdmin(user);
  }

  private assertCanManageShop(actor: RequestUser, targetShopId: string | null | undefined) {
    if (targetShopId) {
      assertUserInTenant(actor, targetShopId);
      return;
    }
    if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
      throw new ForbiddenException('Operation requires a shop in your organisation');
    }
  }

  private normalizeRoleName(roleName: string): RoleName | string {
    const normalized = roleName.toUpperCase().trim();
    const aliasMap: Record<string, RoleName> = {
      SHOP_MANAGER: RoleName.INVENTORY_MANAGER,
      SHOP_STAFF: RoleName.WAREHOUSE_STAFF,
      WAREHOUSE_STAFF: RoleName.WAREHOUSE_STAFF,
      PURCHASE_MANAGER: RoleName.PURCHASE_MANAGER,
      SALES: RoleName.SALES,
      EMPLOYEE: RoleName.EMPLOYEE,
      VIEWER: RoleName.VIEWER,
      VENDOR: RoleName.VENDOR,
      OWNER: RoleName.OWNER,
    };
    if (normalized === 'SHOP_USER') return RoleName.WAREHOUSE_STAFF;
    return aliasMap[normalized] ?? normalized;
  }

  private inviteTtlMs() {
    const hours = Number(this.config.get('INVITE_TTL_HOURS') ?? 72);
    return Math.max(1, hours) * 60 * 60 * 1000;
  }

  private async resolveRoleId(roleIdOrName: string): Promise<string> {
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidLike.test(roleIdOrName)) return roleIdOrName;
    const targetName = this.normalizeRoleName(roleIdOrName);
    const role = await this.prisma.role.findFirst({ where: { name: targetName as RoleName } });
    if (!role) throw new NotFoundException('Role not found');
    return role.id;
  }

  private async assertRoleAssignable(actor: RequestUser, roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    if (role.name === RoleName.OWNER) {
      if (!this.isOwner(actor)) {
        throw new ForbiddenException('Only the organisation owner can assign the Owner role');
      }
      return;
    }

    if (role.name === RoleName.ADMIN) {
      if (!this.isOrgAdmin(actor)) {
        throw new ForbiddenException('Only an administrator can assign the Admin role');
      }
      return;
    }

    if (!this.isOrgAdmin(actor)) {
      throw new ForbiddenException('Insufficient privileges to assign this role');
    }
  }

  async listRoles(actor: RequestUser) {
    const roles = await this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    const overrides = await loadRolePermissionOverrides(this.prisma, actor.companyId);
    return roles.map((role) => {
      const own = LOCKED_ROLES.has(role.name) ? undefined : overrides[role.name];
      return Array.isArray(own) ? { ...role, permissions: own } : role;
    });
  }

  /**
   * Role rows are shared by every tenant, so edits are saved as this
   * company's override and never touch the shared row.
   */
  async updateRolePermissions(actor: RequestUser, roleName: string, permissions: string[]) {
    if (!this.isOrgAdmin(actor)) {
      throw new ForbiddenException('Only an administrator can edit role permissions');
    }
    const companyId = assertCompanyId(actor);
    const targetName = this.normalizeRoleName(roleName);
    const role = await this.prisma.role.findFirst({ where: { name: targetName as RoleName } });
    if (!role) throw new NotFoundException('Role not found');
    if (LOCKED_ROLES.has(role.name)) {
      throw new ForbiddenException('Owner and Admin permissions cannot be changed');
    }
    assertValidPermissions(permissions);

    const overrides = await loadRolePermissionOverrides(this.prisma, companyId);
    const previous = overrides[role.name] ?? (role.permissions as string[]);
    const next = { ...overrides, [role.name]: permissions };
    const key = rolePermissionsKey(companyId);
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: next, createdById: actor.id, updatedById: actor.id },
      update: { value: next, updatedById: actor.id },
    });

    await this.audit.log({
      userId: actor.id,
      companyId,
      action: AuditAction.UPDATE,
      entityType: 'ROLE',
      entityId: role.id,
      oldValues: { permissions: previous },
      newValues: { permissions },
    });

    return { ...role, permissions };
  }

  private resolveShopForActor(actor: RequestUser, requestedShopId?: string | null): string | null {
    if (requestedShopId !== undefined) {
      this.assertCanManageShop(actor, requestedShopId);
      return requestedShopId ?? null;
    }

    const tenantShops = shopIdsForUser(actor);
    if (tenantShops && tenantShops.length > 0) {
      return actor.shopId ?? tenantShops[0];
    }
    if (actor.shopId) {
      return actor.shopId;
    }
    return null;
  }

  async list(actor: RequestUser) {
    return this.prisma.user.findMany({
      where: userListWhere(actor),
      orderBy: { createdAt: 'desc' },
      include: { role: true, shop: true },
      omit: USER_SECRET_FIELDS,
    });
  }

  async create(actor: RequestUser, dto: CreateUserDto) {
    const resolvedShopId = this.resolveShopForActor(actor, dto.shopId);
    dto = { ...dto, shopId: resolvedShopId };

    if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
      if (!dto.shopId || !actor.tenantShopIds.includes(dto.shopId)) {
        throw new ForbiddenException('User must belong to your organisation');
      }
    }

    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (exists) throw new ConflictException('Email already in use');

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
      omit: USER_SECRET_FIELDS,
    });

    await this.audit.log({
      userId: actor.id,
      companyId: assertCompanyId(actor),
      action: AuditAction.CREATE,
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

  async invite(actor: RequestUser, dto: InviteUserDto) {
    const email = dto.email.toLowerCase().trim();
    const inviter = await this.prisma.user.findUnique({
      where: { id: actor.id },
      include: { shop: { include: { company: true } } },
    });

    const exists = await this.prisma.user.findUnique({
      where: { email },
    });
    if (exists) throw new ConflictException('Email already in use');

    const roleId = await this.resolveRoleId(dto.roleId);
    await this.assertRoleAssignable(actor, roleId);

    const shopId = this.resolveShopForActor(actor, dto.shopId);
    if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
      if (shopId && !actor.tenantShopIds.includes(shopId)) {
        throw new ForbiddenException('User must belong to your organisation');
      }
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
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

    const inviteUrl = buildUserInviteAcceptUrl(this.config, token);
    const companyName =
      invitation.shop?.company?.companyName ??
      inviter?.shop?.company?.companyName ??
      'SoftdigitIMS';

    const mailContent: UserInviteEmailContent = {
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
      const defaults = userInviteDefaults(mailContent);
      const prepared = await this.emailNotifications.prepareTemplateForShop(
        invitation.shopId,
        'user_invite',
        { subject: defaults.subject, text: defaults.text, html: defaults.html },
        defaults.context,
      );
      if (!prepared.enabled) {
        throw new BadRequestException('User invitation emails are disabled in settings.');
      }
      const companyId = invitation.shop?.companyId ?? actor.companyId;
      if (!companyId) {
        throw new BadRequestException('Invitation is not linked to a company');
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
    } catch (err) {
      throw new ServiceUnavailableException(
        (err as Error).message || 'Email delivery is not configured. Please check SMTP settings.',
      );
    }

    await this.audit.logTenant(actor, {
      action: AuditAction.CREATE,
      entityType: 'USER_INVITATION',
      entityId: invitation.id,
      newValues: { email, roleId, shopId, expiresAt },
    });

    return { ok: true, email, expiresAt };
  }

  async get(actor: RequestUser, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, shop: true },
      omit: USER_SECRET_FIELDS,
    });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManageShop(actor, user.shopId);
    return user;
  }

  /** Only an Owner may change, deactivate or delete another Owner. */
  private assertCanManageTarget(actor: RequestUser, target: { role: { name: RoleName } }) {
    if (target.role.name === RoleName.OWNER && !this.isOwner(actor)) {
      throw new ForbiddenException('Only the organisation owner can change an Owner account');
    }
  }

  /** Refuses a change that would leave the company without an active Owner. */
  private async assertNotLastOwner(target: { id: string; role: { name: RoleName }; shopId: string | null }) {
    if (target.role.name !== RoleName.OWNER) return;
    const companyId = target.shopId
      ? (await this.prisma.shop.findUnique({ where: { id: target.shopId }, select: { companyId: true } }))?.companyId
      : null;
    if (!companyId) return;
    const others = await this.prisma.user.count({
      where: {
        id: { not: target.id },
        isActive: true,
        deletedAt: null,
        role: { name: RoleName.OWNER },
        shop: { companyId },
      },
    });
    if (others === 0) {
      throw new BadRequestException('The organisation must keep at least one active Owner');
    }
  }

  async update(actor: RequestUser, id: string, dto: UpdateUserDto) {
    const existing = await this.get(actor, id);
    this.assertCanManageTarget(actor, existing);

    if (dto.shopId !== undefined) {
      this.assertCanManageShop(actor, dto.shopId);
      if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
        if (!dto.shopId || !actor.tenantShopIds.includes(dto.shopId)) {
          throw new ForbiddenException('User must belong to your organisation');
        }
      }
    }

    let resolvedRoleId: string | undefined;
    if (dto.roleId) {
      resolvedRoleId = await this.resolveRoleId(dto.roleId);
      await this.assertRoleAssignable(actor, resolvedRoleId);
    }
    if ((resolvedRoleId && resolvedRoleId !== existing.roleId) || dto.isActive === false) {
      await this.assertNotLastOwner(existing);
    }

    if (dto.email) {
      const exists = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase().trim(), id: { not: id } },
      });
      if (exists) throw new ConflictException('Email already in use');
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
      omit: USER_SECRET_FIELDS,
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
      companyId: assertCompanyId(actor),
      action: AuditAction.UPDATE,
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

  async remove(actor: RequestUser, id: string) {
    const existing = await this.get(actor, id);
    if (existing.id === actor.id) {
      throw new BadRequestException('You cannot disable your own account');
    }
    this.assertCanManageTarget(actor, existing);
    await this.assertNotLastOwner(existing);
    if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
      if (!existing.shopId || !actor.tenantShopIds.includes(existing.shopId)) {
        throw new ForbiddenException('User is outside your organisation');
      }
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    await this.invalidateWhatsAppAuthCache(id);

    await this.audit.log({
      userId: actor.id,
      companyId: assertCompanyId(actor),
      action: AuditAction.UPDATE,
      entityType: 'USER',
      entityId: existing.id,
      oldValues: { isActive: existing.isActive, deletedAt: null },
      newValues: { isActive: false, deletedAt: new Date().toISOString() },
    });

    return { ok: true };
  }
}
