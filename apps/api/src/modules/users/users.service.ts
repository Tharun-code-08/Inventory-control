import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuditAction, RoleName } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private bcryptRounds() {
    const value = Number(this.config.get<string | number>('BCRYPT_ROUNDS') ?? 12);
    return Number.isFinite(value) && value >= 10 && value <= 14 ? value : 12;
  }

  private isAdmin(user: RequestUser) {
    return user.role === RoleName.ADMIN;
  }

  private assertCanManageShop(actor: RequestUser, targetShopId: string | null | undefined) {
    if (this.isAdmin(actor)) return;
    if (!actor.shopId) {
      throw new ForbiddenException('Operation requires a shop scope');
    }
    if (targetShopId && targetShopId !== actor.shopId) {
      throw new ForbiddenException('Cannot manage users from another shop');
    }
  }

  private normalizeRoleName(roleName: string): RoleName {
    const normalized = roleName.toUpperCase().trim();
    const aliasMap: Record<string, RoleName> = {
      SHOP_MANAGER: RoleName.INVENTORY_MANAGER,
      SHOP_STAFF: RoleName.SHOP_USER,
      VIEWER: RoleName.SHOP_USER,
    };
    return aliasMap[normalized] ?? (normalized as RoleName);
  }

  private async resolveRoleId(roleIdOrName: string) {
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidLike.test(roleIdOrName)) return roleIdOrName;
    const targetName = this.normalizeRoleName(roleIdOrName);
    const role = await this.prisma.role.findFirst({ where: { name: targetName } });
    if (!role) throw new NotFoundException('Role not found');
    return role.id;
  }

  private async assertRoleAssignable(actor: RequestUser, roleId: string) {
    if (this.isAdmin(actor)) return;
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.name === RoleName.ADMIN) {
      throw new ForbiddenException('Only an administrator can assign the ADMIN role');
    }
  }

  async listRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async updateRolePermissions(actor: RequestUser, roleName: string, permissions: string[]) {
    if (!this.isAdmin(actor)) {
      throw new ForbiddenException('Only an administrator can edit role permissions');
    }
    const targetName = this.normalizeRoleName(roleName);
    const role = await this.prisma.role.findFirst({ where: { name: targetName } });
    if (!role) throw new NotFoundException('Role not found');
    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data: { permissions },
    });
    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'ROLE',
      entityId: role.id,
      oldValues: { permissions: role.permissions },
      newValues: { permissions },
    });
    return updated;
  }

  async list(actor: RequestUser) {
    return this.prisma.user.findMany({
      where: this.isAdmin(actor) ? undefined : { shopId: actor.shopId ?? '__never__' },
      orderBy: { createdAt: 'desc' },
      include: { role: true, shop: true },
    });
  }

  async create(
    actor: RequestUser,
    dto: { name: string; email: string; password: string; roleId: string; shopId?: string; isActive?: boolean },
  ) {
    if (dto.shopId !== undefined) {
      this.assertCanManageShop(actor, dto.shopId);
    } else if (!this.isAdmin(actor)) {
      // Non-admins can only create users in their own shop scope.
      dto = { ...dto, shopId: actor.shopId ?? undefined };
      if (!dto.shopId) {
        throw new BadRequestException('shopId is required');
      }
    }

    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (exists) throw new ConflictException('Email already in use');

    const roleId = await this.resolveRoleId(dto.roleId);
    await this.assertRoleAssignable(actor, roleId);

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const created = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        roleId,
        shopId: dto.shopId,
        isActive: dto.isActive ?? true,
      },
      include: { role: true, shop: true },
    });

    await this.audit.log({
      userId: actor.id,
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

  async get(actor: RequestUser, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, shop: true },
    });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManageShop(actor, user.shopId);
    return user;
  }

  async update(
    actor: RequestUser,
    id: string,
    dto: Partial<{ name: string; email: string; password: string; roleId: string; shopId: string | null; isActive: boolean }>,
  ) {
    const existing = await this.get(actor, id);

    if (dto.shopId !== undefined) {
      this.assertCanManageShop(actor, dto.shopId);
    }

    let resolvedRoleId: string | undefined;
    if (dto.roleId) {
      resolvedRoleId = await this.resolveRoleId(dto.roleId);
      await this.assertRoleAssignable(actor, resolvedRoleId);
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, this.bcryptRounds())
      : undefined;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email: dto.email?.toLowerCase().trim(),
        passwordHash,
        roleId: resolvedRoleId,
        shopId: dto.shopId === null ? null : dto.shopId,
        isActive: dto.isActive,
      },
      include: { role: true, shop: true },
    });

    await this.audit.log({
      userId: actor.id,
      action: dto.password ? AuditAction.UPDATE : AuditAction.UPDATE,
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
    // Soft-delete: clear active flag AND stamp deletedAt so the soft-delete
    // middleware filters this row out of subsequent list/count queries.
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'USER',
      entityId: existing.id,
      oldValues: { isActive: existing.isActive, deletedAt: null },
      newValues: { isActive: false, deletedAt: new Date().toISOString() },
    });
    return { ok: true };
  }
}
