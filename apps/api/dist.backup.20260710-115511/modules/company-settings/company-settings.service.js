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
exports.CompanySettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let CompanySettingsService = class CompanySettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        return this.prisma.companySetting.findMany({
            where: { companyId },
            orderBy: { key: 'asc' },
        });
    }
    async get(user, key) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        const setting = await this.prisma.companySetting.findUnique({
            where: { companyId_key: { companyId, key } },
        });
        if (!setting) {
            throw new common_1.NotFoundException(`Setting with key "${key}" not found`);
        }
        return setting;
    }
    async upsert(user, key, value) {
        const companyId = (0, shop_scope_1.requireCompanyId)(user);
        return this.prisma.companySetting.upsert({
            where: { companyId_key: { companyId, key } },
            create: { companyId, key, value },
            update: { value },
        });
    }
    async getSetting(companyId, key) {
        const setting = await this.prisma.companySetting.findUnique({
            where: { companyId_key: { companyId, key } },
        });
        return setting ? setting.value : null;
    }
    async getUnknownBarcodePolicy(companyId) {
        const value = await this.getSetting(companyId, 'UNKNOWN_BARCODE_POLICY');
        if (value === 'AUTO_CREATE' || value === 'REJECT') {
            return value;
        }
        return 'ASK';
    }
};
exports.CompanySettingsService = CompanySettingsService;
exports.CompanySettingsService = CompanySettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompanySettingsService);
//# sourceMappingURL=company-settings.service.js.map