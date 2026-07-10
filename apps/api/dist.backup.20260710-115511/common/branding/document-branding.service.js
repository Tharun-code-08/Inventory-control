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
exports.DocumentBrandingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const branding_service_1 = require("./branding.service");
let DocumentBrandingService = class DocumentBrandingService {
    prisma;
    brandingService;
    constructor(prisma, brandingService) {
        this.prisma = prisma;
        this.brandingService = brandingService;
    }
    async getSettings(companyId, documentType) {
        const settings = await this.prisma.documentBranding.findUnique({
            where: {
                companyId_documentType: {
                    companyId,
                    documentType,
                },
            },
        });
        return settings?.settings || this.getDefaultSettings(documentType);
    }
    async updateSettings(companyId, documentType, settings, userId) {
        const result = await this.prisma.documentBranding.upsert({
            where: {
                companyId_documentType: {
                    companyId,
                    documentType,
                },
            },
            create: {
                companyId,
                documentType,
                settings,
                createdById: userId,
                updatedById: userId,
            },
            update: {
                settings,
                updatedById: userId,
                updatedAt: new Date(),
            },
        });
        await this.brandingService.invalidateDocumentSettingsCache(companyId, documentType);
        await this.brandingService.invalidateEffectiveCache(companyId);
        return result;
    }
    async getAllSettings(companyId) {
        return this.prisma.documentBranding.findMany({
            where: { companyId },
        });
    }
    async resetSettings(companyId, documentType, _userId) {
        await this.prisma.documentBranding.delete({
            where: {
                companyId_documentType: {
                    companyId,
                    documentType,
                },
            },
        });
        await this.brandingService.invalidateDocumentSettingsCache(companyId, documentType);
        await this.brandingService.invalidateEffectiveCache(companyId);
        return this.getDefaultSettings(documentType);
    }
    getDefaultSettings(documentType) {
        const defaults = {
            INVOICE: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: true,
                showSeal: false,
            },
            PURCHASE_ORDER: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            QUOTATION: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: true,
                showSeal: false,
            },
            GOODS_ISSUE: {
                showLogo: true,
                showGST: true,
                showAddress: false,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            GOODS_RECEIPT: {
                showLogo: true,
                showGST: true,
                showAddress: false,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            EWAY_BILL: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            DELIVERY_CHALLAN: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            CREDIT_NOTE: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: true,
                showSeal: false,
            },
            DEBIT_NOTE: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: true,
                showSeal: false,
            },
            PRODUCTION_ORDER: {
                showLogo: true,
                showGST: false,
                showAddress: true,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            SERVICE_ORDER: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: true,
                showSeal: false,
            },
            RFQ: {
                showLogo: true,
                showGST: false,
                showAddress: true,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            DELIVERY_NOTE: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: true,
                showSeal: false,
            },
            STOCK_TRANSFER: {
                showLogo: true,
                showGST: false,
                showAddress: false,
                showFooter: false,
                showSignature: false,
                showSeal: false,
            },
            PURCHASE_RETURN: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            SALES_RETURN: {
                showLogo: true,
                showGST: true,
                showAddress: true,
                showFooter: true,
                showSignature: true,
                showSeal: false,
            },
            MATERIAL_REQUEST: {
                showLogo: true,
                showGST: false,
                showAddress: false,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            WORK_ORDER: {
                showLogo: true,
                showGST: false,
                showAddress: true,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
            REPORT: {
                showLogo: true,
                showGST: false,
                showAddress: false,
                showFooter: true,
                showSignature: false,
                showSeal: false,
            },
        };
        return defaults[documentType];
    }
};
exports.DocumentBrandingService = DocumentBrandingService;
exports.DocumentBrandingService = DocumentBrandingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        branding_service_1.BrandingService])
], DocumentBrandingService);
//# sourceMappingURL=document-branding.service.js.map