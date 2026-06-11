import { AuditAction, RoleName } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import type { RequestUser } from '../../common/types/request-user';
import { assertCompanyId } from '../../common/utils/assert-company-id';
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

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly subscriptions: SubscriptionService,
    private readonly emailNotifications: EmailNotificationsService,
  ) {}

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

  async listRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async updateRolePermissions(actor: RequestUser, roleName: string, permissions: string[]) {
    if (!this.isOrgAdmin(actor)) {
      throw new ForbiddenException('Only an administrator can edit role permissions');
    }
    const targetName = this.normalizeRoleName(roleName);
    const role = await this.prisma.role.findFirst({ where: { name: targetName as RoleName } });
    if (!role) throw new NotFoundException('Role not found');

    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data: { permissions },
    });

    await this.audit.log({
      userId: actor.id,
      companyId: assertCompanyId(actor),
      action: AuditAction.UPDATE,
      entityType: 'ROLE',
      entityId: role.id,
      oldValues: { permissions: role.permissions },
      newValues: { permissions },
    });

    return updated;
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
    });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManageShop(actor, user.shopId);
    return user;
  }

  async update(actor: RequestUser, id: string, dto: UpdateUserDto) {
    const existing = await this.get(actor, id);

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
    if (actor.tenantShopIds && actor.tenantShopIds.length > 0) {
      if (!existing.shopId || !actor.tenantShopIds.includes(existing.shopId)) {
        throw new ForbiddenException('User is outside your organisation');
      }
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

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
