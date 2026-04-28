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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeRoleName(roleName) {
        const normalized = roleName.toUpperCase().trim();
        const aliasMap = {
            SHOP_MANAGER: client_1.RoleName.INVENTORY_MANAGER,
            SHOP_STAFF: client_1.RoleName.SHOP_USER,
            VIEWER: client_1.RoleName.SHOP_USER,
        };
        return aliasMap[normalized] ?? normalized;
    }
    async resolveRoleId(roleIdOrName) {
        const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidLike.test(roleIdOrName))
            return roleIdOrName;
        const targetName = this.normalizeRoleName(roleIdOrName);
        const roles = await this.prisma.role.findMany();
        const role = roles.find((item) => item.name === targetName);
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        return role.id;
    }
    async listRoles() {
        return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    }
    async updateRolePermissions(roleName, permissions) {
        const targetName = this.normalizeRoleName(roleName);
        const role = await this.prisma.role.findFirst({ where: { name: targetName } });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
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
    async create(dto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
        if (exists)
            throw new common_1.ConflictException('Email already in use');
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
    async get(id) {
        const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true, shop: true } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async update(id, dto) {
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
    async remove(id) {
        await this.get(id);
        await this.prisma.user.update({ where: { id }, data: { isActive: false } });
        return { ok: true };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map