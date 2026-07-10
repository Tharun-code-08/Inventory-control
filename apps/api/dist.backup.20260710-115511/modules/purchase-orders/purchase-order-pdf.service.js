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
var PurchaseOrderPdfService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOrderPdfService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const branding_service_1 = require("../../common/branding/branding.service");
const pdf_branding_adapter_1 = require("../../common/pdf/pdf-branding.adapter");
const html_to_pdf_service_1 = require("../../common/pdf/html-to-pdf.service");
const purchase_order_builder_1 = require("../../common/pdf/builders/purchase-order.builder");
const branding_utils_1 = require("../../common/branding/branding.utils");
let PurchaseOrderPdfService = PurchaseOrderPdfService_1 = class PurchaseOrderPdfService {
    prisma;
    brandingService;
    logger = new common_1.Logger(PurchaseOrderPdfService_1.name);
    constructor(prisma, brandingService) {
        this.prisma = prisma;
        this.brandingService = brandingService;
    }
    async generatePdf(poId) {
        const po = await (0, purchase_order_builder_1.loadPurchaseOrderForPdf)(this.prisma, poId);
        const shop = await this.prisma.shop.findUnique({
            where: { id: po.shopId },
            include: { company: { select: { id: true, companyName: true } } },
        });
        if (!shop || !shop.company)
            throw new Error(`Shop or company not found`);
        let snapshot = (0, branding_utils_1.asBrandingSnapshotOrNull)(po.brandingSnapshot);
        if (!snapshot) {
            snapshot = await this.brandingService.createBrandingSnapshot(shop.company.id, po.shopId, 'PURCHASE_ORDER');
        }
        const viewModel = await (0, purchase_order_builder_1.buildPurchaseOrderPdfViewModel)(this.prisma, po, shop.company.id);
        let html = (0, purchase_order_builder_1.renderPurchaseOrderHtml)(viewModel);
        html = pdf_branding_adapter_1.PdfBrandingAdapter.applyAllBranding(html, snapshot);
        const pdf = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)(html);
        if (!po.brandingSnapshot) {
            await this.prisma.purchaseOrderHeader.update({
                where: { id: poId },
                data: { brandingSnapshot: snapshot },
            });
            this.logger.log(`Snapshot persisted for PO ${poId}`);
        }
        return pdf;
    }
    async regeneratePdf(poId) {
        const po = await (0, purchase_order_builder_1.loadPurchaseOrderForPdf)(this.prisma, poId);
        if (!po.brandingSnapshot) {
            throw new Error(`PO ${poId} has no branding snapshot`);
        }
        const snapshot = (0, branding_utils_1.asBrandingSnapshotOrNull)(po.brandingSnapshot);
        if (!snapshot) {
            throw new Error(`PO ${poId} snapshot is null/undefined`);
        }
        if (!this.brandingService.validateChecksumIntegrity(snapshot)) {
            this.logger.warn(`Checksum mismatch for PO ${poId}`);
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: po.shopId },
            include: { company: { select: { id: true } } },
        });
        if (!shop || !shop.company)
            throw new Error(`Shop or company not found`);
        const viewModel = await (0, purchase_order_builder_1.buildPurchaseOrderPdfViewModel)(this.prisma, po, shop.company.id);
        let html = (0, purchase_order_builder_1.renderPurchaseOrderHtml)(viewModel);
        html = pdf_branding_adapter_1.PdfBrandingAdapter.applyAllBranding(html, snapshot);
        return (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)(html);
    }
};
exports.PurchaseOrderPdfService = PurchaseOrderPdfService;
exports.PurchaseOrderPdfService = PurchaseOrderPdfService = PurchaseOrderPdfService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        branding_service_1.BrandingService])
], PurchaseOrderPdfService);
//# sourceMappingURL=purchase-order-pdf.service.js.map