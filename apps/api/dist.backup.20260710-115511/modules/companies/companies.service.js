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
const shop_scope_1 = require("../../common/utils/shop-scope");
const branding_profile_service_1 = require("../../common/branding/branding-profile.service");
const branding_resolver_service_1 = require("../../common/branding/branding-resolver.service");
let CompaniesService = class CompaniesService {
    prisma;
    branding;
    brandingResolver;
    constructor(prisma, branding, brandingResolver) {
        this.prisma = prisma;
        this.branding = branding;
        this.brandingResolver = brandingResolver;
    }
    async list(user) {
        return this.prisma.company.findMany({
            where: (0, shop_scope_1.companyListWhere)(user),
            orderBy: { companyCode: 'asc' },
        });
    }
    async create(user, dto) {
        void dto;
        if ((0, shop_scope_1.companyIdForUser)(user)) {
            throw new common_1.BadRequestException('Your organisation already exists. Update your company profile instead of creating another.');
        }
        throw new common_1.BadRequestException('New organisations are created during sign-up. Sign out and use Create account if you need a separate organisation.');
    }
    async get(user, id) {
        const item = await this.prisma.company.findUnique({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('Company not found');
        (0, shop_scope_1.assertCompanyInTenant)(user, item.id);
        return item;
    }
    async update(user, id, dto) {
        const current = await this.get(user, id);
        const updated = await this.prisma.company.update({
            where: { id },
            data: {
                companyCode: dto.companyCode,
                companyName: dto.companyName,
                address: dto.address,
                isActive: dto.isActive,
                updatedById: user.id,
            },
        });
        const nameChanged = dto.companyName !== undefined && dto.companyName !== current.companyName;
        const addressChanged = dto.address !== undefined && dto.address !== current.address;
        if (nameChanged || addressChanged) {
            await this.branding.bumpBrandingVersionForCompany(id, user);
        }
        return updated;
    }
    async updateBranding(user, id, dto, logo) {
        await this.get(user, id);
        return this.branding.updateCompanyBranding(user, id, dto, logo);
    }
    async getBranding(user, id) {
        await this.get(user, id);
        const profile = await this.brandingResolver.resolveForCompany(id);
        return {
            profile,
            health: this.brandingResolver.buildHealth(profile),
        };
    }
    async remove(user, id) {
        await this.get(user, id);
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        const shopCount = await this.prisma.shop.count({ where: { companyId } });
        if (shopCount > 0) {
            throw new common_1.BadRequestException('Cannot deactivate this company while plants are still linked. Deactivate plants first.');
        }
        return this.prisma.company.update({
            where: { id },
            data: { isActive: false, updatedById: user.id },
        });
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        branding_profile_service_1.BrandingProfileService,
        branding_resolver_service_1.BrandingResolverService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map