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
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CompaniesService = class CompaniesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list() {
        return this.prisma.company.findMany({ orderBy: { companyCode: 'asc' } });
    }
    async create(user, dto) {
        const count = await this.prisma.company.count();
        const code = dto.companyCode?.trim() || `COMP-${String(count + 1).padStart(3, '0')}`;
        return this.prisma.company.create({
            data: {
                companyCode: code,
                companyName: dto.companyName,
                address: dto.address ?? null,
                isActive: dto.isActive ?? true,
                createdById: user.id,
            },
        });
    }
    async get(id) {
        const item = await this.prisma.company.findUnique({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('Company not found');
        return item;
    }
    async update(user, id, dto) {
        await this.get(id);
        return this.prisma.company.update({
            where: { id },
            data: {
                companyCode: dto.companyCode,
                companyName: dto.companyName,
                address: dto.address,
                isActive: dto.isActive,
                updatedById: user.id,
            },
        });
    }
    async remove(user, id) {
        await this.get(id);
        return this.prisma.company.update({
            where: { id },
            data: { isActive: false, updatedById: user.id },
        });
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map