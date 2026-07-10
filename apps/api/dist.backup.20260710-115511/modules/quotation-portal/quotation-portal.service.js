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
exports.QuotationPortalService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const money_1 = require("../../common/utils/money");
const quoteInclude = {
    customer: { select: { customerName: true, email: true } },
    shop: { select: { shopName: true, shopNumber: true } },
    items: {
        include: {
            product: { select: { productCode: true, description: true } },
        },
    },
};
let QuotationPortalService = class QuotationPortalService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByToken(portalToken) {
        const row = await this.prisma.salesQuotationHeader.findUnique({
            where: { portalToken },
            include: quoteInclude,
        });
        if (!row)
            throw new common_1.NotFoundException('Quotation link is invalid or has expired');
        return row;
    }
    toPortalView(row) {
        const canRespond = row.status === client_1.SalesQuotationStatus.SENT;
        return {
            id: row.id,
            quoteNumber: row.quoteNumber,
            quoteDate: row.quoteDate,
            validUntil: row.validUntil,
            status: row.status,
            remarks: row.remarks,
            totalValue: row.totalValue?.toString() ?? '0',
            customerRequestedTotal: row.customerRequestedTotal?.toString() ?? null,
            customerRequestNote: row.customerRequestNote,
            customer: row.customer,
            shop: row.shop,
            canRespond,
            items: row.items.map((item) => ({
                id: item.id,
                productCode: item.product.productCode,
                description: item.product.description,
                quantity: item.quantity.toString(),
                uom: item.uom,
                unitPrice: item.unitPrice.toString(),
                lineValue: item.lineValue.toString(),
            })),
        };
    }
    async getByToken(portalToken) {
        const row = await this.findByToken(portalToken);
        return this.toPortalView(row);
    }
    async accept(portalToken) {
        const row = await this.findByToken(portalToken);
        if (row.status !== client_1.SalesQuotationStatus.SENT) {
            throw new common_1.BadRequestException('This quotation is no longer awaiting your response');
        }
        const updated = await this.prisma.salesQuotationHeader.update({
            where: { id: row.id },
            data: {
                status: client_1.SalesQuotationStatus.ACCEPTED,
                customerRespondedAt: new Date(),
                customerRequestedTotal: null,
                customerRequestNote: null,
            },
            include: quoteInclude,
        });
        return {
            message: 'Thank you. Your acceptance has been recorded.',
            quotation: this.toPortalView(updated),
        };
    }
    async requestRevision(portalToken, dto) {
        const row = await this.findByToken(portalToken);
        if (row.status !== client_1.SalesQuotationStatus.SENT) {
            throw new common_1.BadRequestException('This quotation is no longer awaiting your response');
        }
        const requested = (0, money_1.roundMoney)((0, money_1.asMoney)(dto.requestedTotal));
        const currentTotal = row.totalValue ?? (0, money_1.asMoney)(0);
        if (requested.gte(currentTotal)) {
            throw new common_1.BadRequestException('Please enter an amount lower than the quoted total if you are requesting revised pricing');
        }
        const updated = await this.prisma.salesQuotationHeader.update({
            where: { id: row.id },
            data: {
                status: client_1.SalesQuotationStatus.USER_REQUESTED,
                customerRequestedTotal: requested,
                customerRequestNote: dto.note?.trim() || null,
                customerRespondedAt: new Date(),
            },
            include: quoteInclude,
        });
        return {
            message: 'Your pricing feedback has been submitted. Our team will review your request and may send you a revised quotation.',
            quotation: this.toPortalView(updated),
        };
    }
};
exports.QuotationPortalService = QuotationPortalService;
exports.QuotationPortalService = QuotationPortalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuotationPortalService);
//# sourceMappingURL=quotation-portal.service.js.map