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
exports.QuotationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const document_number_service_1 = require("../stock/document-number.service");
let QuotationsService = class QuotationsService {
    prisma;
    numbers;
    constructor(prisma, numbers) {
        this.prisma = prisma;
        this.numbers = numbers;
    }
    async list(user, rfqId) {
        const where = {
            ...(rfqId ? { rfqId } : {}),
            ...(user.shopId ? { shopId: user.shopId } : {}),
        };
        return this.prisma.supplierQuotationHeader.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                supplier: true,
                rfq: true,
                items: { include: { product: true, rfqItem: true } },
            },
        });
    }
    async create(user, dto) {
        const rfq = await this.prisma.rfqHeader.findUnique({ where: { id: dto.rfqId } });
        if (!rfq)
            throw new common_1.NotFoundException('RFQ not found');
        (0, shop_scope_1.assertShopScope)(user, rfq.shopId);
        const count = await this.prisma.supplierQuotationHeader.count({ where: { shopId: rfq.shopId } });
        const quoteNumber = `QUO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        return this.prisma.supplierQuotationHeader.create({
            data: {
                quoteNumber,
                quoteDate: dto.quoteDate ? new Date(dto.quoteDate) : new Date(),
                shopId: rfq.shopId,
                rfqId: dto.rfqId,
                supplierId: dto.supplierId,
                notes: dto.notes ?? null,
                status: client_1.DocumentStatus.DRAFT,
                createdById: user.id,
                items: {
                    create: (dto.items ?? []).map((item) => ({
                        rfqItemId: item.rfqItemId ?? null,
                        productId: item.productId ?? null,
                        description: item.description ?? null,
                        quantity: new client_1.Prisma.Decimal(item.quantity ?? 0),
                        uom: item.uom ?? 'UNIT',
                        specifications: item.specifications ?? null,
                        unitPrice: new client_1.Prisma.Decimal(item.unitPrice ?? 0),
                        lineValue: new client_1.Prisma.Decimal((item.quantity ?? 0) * (item.unitPrice ?? 0)),
                        createdById: user.id,
                    })),
                },
            },
            include: {
                supplier: true,
                rfq: true,
                items: { include: { product: true, rfqItem: true } },
            },
        });
    }
    async get(user, id) {
        const row = await this.prisma.supplierQuotationHeader.findUnique({
            where: { id },
            include: {
                supplier: true,
                rfq: true,
                items: { include: { product: true, rfqItem: true } },
            },
        });
        if (!row)
            throw new common_1.NotFoundException('Quotation not found');
        (0, shop_scope_1.assertShopScope)(user, row.shopId);
        return row;
    }
    async update(user, id, dto) {
        const row = await this.get(user, id);
        return this.prisma.$transaction(async (tx) => {
            await tx.supplierQuotationItem.deleteMany({ where: { quoteHeaderId: id } });
            return tx.supplierQuotationHeader.update({
                where: { id },
                data: {
                    quoteDate: dto.quoteDate ? new Date(dto.quoteDate) : row.quoteDate,
                    supplierId: dto.supplierId ?? row.supplierId,
                    notes: dto.notes ?? null,
                    updatedById: user.id,
                    items: {
                        create: (dto.items ?? []).map((item) => ({
                            rfqItemId: item.rfqItemId ?? null,
                            productId: item.productId ?? null,
                            description: item.description ?? null,
                            quantity: new client_1.Prisma.Decimal(item.quantity ?? 0),
                            uom: item.uom ?? 'UNIT',
                            specifications: item.specifications ?? null,
                            unitPrice: new client_1.Prisma.Decimal(item.unitPrice ?? 0),
                            lineValue: new client_1.Prisma.Decimal((item.quantity ?? 0) * (item.unitPrice ?? 0)),
                            createdById: user.id,
                        })),
                    },
                },
                include: {
                    supplier: true,
                    rfq: true,
                    items: { include: { product: true, rfqItem: true } },
                },
            });
        });
    }
    async submit(user, id) {
        await this.get(user, id);
        return this.prisma.supplierQuotationHeader.update({
            where: { id },
            data: { status: client_1.DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
        });
    }
    async acceptAndAutoLink(user, id) {
        const quote = await this.get(user, id);
        if (quote.items.some((item) => !item.productId)) {
            throw new common_1.BadRequestException('All quotation items must reference products for auto-linking');
        }
        return this.prisma.$transaction(async (tx) => {
            const existingContract = await tx.contractHeader.findFirst({ where: { quotationId: quote.id } });
            if (existingContract) {
                const existingPo = await tx.purchaseOrderHeader.findFirst({ where: { contractId: existingContract.id } });
                const existingGr = existingPo
                    ? await tx.goodsReceiptHeader.findFirst({ where: { purchaseOrderId: existingPo.id } })
                    : null;
                return { quote, contract: existingContract, purchaseOrder: existingPo, goodsReceiptDraft: existingGr, idempotent: true };
            }
            const contractNumber = await this.numbers.nextNumber(tx, {
                shopId: quote.shopId,
                docType: 'CT',
                prefix: 'CT',
                date: new Date(),
            });
            const contract = await tx.contractHeader.create({
                data: {
                    contractNumber,
                    shopId: quote.shopId,
                    supplierId: quote.supplierId,
                    rfqId: quote.rfqId,
                    quotationId: quote.id,
                    title: `Auto Contract ${quote.quoteNumber}`,
                    startDate: new Date(),
                    notes: quote.notes ?? null,
                    status: client_1.DocumentStatus.POSTED,
                    postedAt: new Date(),
                    createdById: user.id,
                    items: {
                        create: quote.items.map((item) => ({
                            productId: item.productId,
                            description: item.description,
                            quantity: item.quantity,
                            uom: item.uom,
                            unitPrice: item.unitPrice,
                            lineValue: item.lineValue,
                            createdById: user.id,
                        })),
                    },
                },
            });
            const poNumber = await this.numbers.nextNumber(tx, {
                shopId: quote.shopId,
                docType: 'PO',
                prefix: 'PO',
                date: new Date(),
            });
            const purchaseOrder = await tx.purchaseOrderHeader.create({
                data: {
                    poNumber,
                    poDate: new Date(),
                    shopId: quote.shopId,
                    contractId: contract.id,
                    supplier: quote.supplier.supplierName,
                    status: client_1.PurchaseOrderStatus.CONFIRMED,
                    remarks: `Auto-generated from quotation ${quote.quoteNumber}`,
                    totalValue: quote.items.reduce((sum, it) => sum.add(it.lineValue), new client_1.Prisma.Decimal(0)),
                    createdById: user.id,
                    items: {
                        create: quote.items.map((item) => ({
                            productId: item.productId,
                            currentStock: new client_1.Prisma.Decimal(0),
                            minStock: new client_1.Prisma.Decimal(0),
                            suggestedQty: item.quantity,
                            orderQty: item.quantity,
                            rate: item.unitPrice,
                            lineValue: item.lineValue,
                            createdById: user.id,
                        })),
                    },
                },
            });
            const grNumber = await this.numbers.nextNumber(tx, {
                shopId: quote.shopId,
                docType: 'GR',
                prefix: 'GR',
                date: new Date(),
            });
            const goodsReceiptDraft = await tx.goodsReceiptHeader.create({
                data: {
                    grNumber,
                    grDate: new Date(),
                    shopId: quote.shopId,
                    purchaseOrderId: purchaseOrder.id,
                    supplierName: quote.supplier.supplierName,
                    supplierRef: purchaseOrder.poNumber,
                    remarks: `Auto-draft from PO ${purchaseOrder.poNumber}`,
                    status: client_1.DocumentStatus.DRAFT,
                    createdById: user.id,
                    items: {
                        create: quote.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            uom: item.uom,
                            purchaseRate: item.unitPrice,
                            lineValue: item.lineValue,
                            createdById: user.id,
                        })),
                    },
                },
            });
            const updatedQuote = await tx.supplierQuotationHeader.update({
                where: { id: quote.id },
                data: { status: client_1.DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
            });
            return { quote: updatedQuote, contract, purchaseOrder, goodsReceiptDraft, idempotent: false };
        });
    }
};
exports.QuotationsService = QuotationsService;
exports.QuotationsService = QuotationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_number_service_1.DocumentNumberService])
], QuotationsService);
//# sourceMappingURL=quotations.service.js.map