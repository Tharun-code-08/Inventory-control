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
var InvoicePdfService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicePdfService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const branding_service_1 = require("../../common/branding/branding.service");
const pdf_branding_adapter_1 = require("../../common/pdf/pdf-branding.adapter");
const html_to_pdf_service_1 = require("../../common/pdf/html-to-pdf.service");
const invoice_builder_1 = require("../../common/pdf/builders/invoice.builder");
const branding_utils_1 = require("../../common/branding/branding.utils");
let InvoicePdfService = InvoicePdfService_1 = class InvoicePdfService {
    prisma;
    brandingService;
    logger = new common_1.Logger(InvoicePdfService_1.name);
    constructor(prisma, brandingService) {
        this.prisma = prisma;
        this.brandingService = brandingService;
    }
    async generatePdf(invoiceId) {
        const invoice = await (0, invoice_builder_1.loadInvoiceForPdf)(this.prisma, invoiceId);
        const shop = await this.prisma.shop.findUnique({
            where: { id: invoice.shopId },
            include: {
                company: {
                    select: { id: true, companyName: true, brandingProfile: true },
                },
            },
        });
        if (!shop || !shop.company)
            throw new Error(`Shop or company not found for ${invoice.shopId}`);
        let snapshot = (0, branding_utils_1.asBrandingSnapshotOrNull)(invoice.brandingSnapshot);
        if (!snapshot) {
            snapshot = await this.brandingService.createBrandingSnapshot(shop.company.id, invoice.shopId, 'INVOICE');
        }
        const viewModel = await (0, invoice_builder_1.buildInvoicePdfViewModel)(this.prisma, invoice);
        let html = (0, invoice_builder_1.renderInvoiceHtml)(viewModel);
        html = pdf_branding_adapter_1.PdfBrandingAdapter.applyAllBranding(html, snapshot);
        const pdf = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)(html);
        if (!invoice.brandingSnapshot) {
            await this.prisma.invoiceHeader.update({
                where: { id: invoiceId },
                data: {
                    brandingSnapshot: snapshot,
                },
            });
            this.logger.log(`Snapshot persisted for invoice ${invoiceId}`);
        }
        return pdf;
    }
    async regeneratePdf(invoiceId) {
        const invoice = await (0, invoice_builder_1.loadInvoiceForPdf)(this.prisma, invoiceId);
        if (!invoice.brandingSnapshot) {
            throw new Error(`Invoice ${invoiceId} has no branding snapshot. Cannot regenerate with historical accuracy.`);
        }
        const snapshot = (0, branding_utils_1.asBrandingSnapshotOrNull)(invoice.brandingSnapshot);
        if (!snapshot) {
            throw new Error(`Invoice ${invoiceId} snapshot is null/undefined.`);
        }
        if (!this.brandingService.validateChecksumIntegrity(snapshot)) {
            this.logger.warn(`Checksum mismatch for invoice ${invoiceId}. Snapshot may be corrupted.`);
        }
        const viewModel = await (0, invoice_builder_1.buildInvoicePdfViewModel)(this.prisma, invoice);
        let html = (0, invoice_builder_1.renderInvoiceHtml)(viewModel);
        html = pdf_branding_adapter_1.PdfBrandingAdapter.applyAllBranding(html, snapshot);
        return (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)(html);
    }
};
exports.InvoicePdfService = InvoicePdfService;
exports.InvoicePdfService = InvoicePdfService = InvoicePdfService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        branding_service_1.BrandingService])
], InvoicePdfService);
//# sourceMappingURL=invoice-pdf.service.js.map