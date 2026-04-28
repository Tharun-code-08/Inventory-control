import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const roles = await this.prisma.role.findMany();
    const role = roles.find((item) => item.name === targetName);
    if (!role) throw new NotFoundException('Role not found');
    return role.id;
  }

  async listRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async updateRolePermissions(roleName: string, permissions: string[]) {
    const targetName = this.normalizeRoleName(roleName);
    const role = await this.prisma.role.findFirst({ where: { name: targetName } });
    if (!role) throw new NotFoundException('Role not found');
    return this.prisma.role.update({
      where: { id: role.id },
      data: { permissions, updatedAt: new Date() },
    });
  }

  async list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { role: true, shop: true },
    });
  }

  async create(dto: { name: string; email: string; password: string; roleId: string; shopId?: string; isActive?: boolean }) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (exists) throw new ConflictException('Email already in use');
    const roleId = await this.resolveRoleId(dto.roleId);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
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
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true, shop: true } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: Partial<{ name: string; email: string; password: string; roleId: string; shopId: string | null; isActive: boolean }>) {
    await this.get(id);
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    const resolvedRoleId = dto.roleId ? await this.resolveRoleId(dto.roleId) : undefined;
    return this.prisma.user.update({
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
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }
}
