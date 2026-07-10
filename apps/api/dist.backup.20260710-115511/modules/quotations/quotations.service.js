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
const rfqs_service_1 = require("../rfqs/rfqs.service");
let QuotationsService = class QuotationsService {
    prisma;
    numbers;
    rfqs;
    constructor(prisma, numbers, rfqs) {
        this.prisma = prisma;
        this.numbers = numbers;
        this.rfqs = rfqs;
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
        const invited = await this.prisma.rfqSupplier.findFirst({
            where: { rfqId: dto.rfqId, supplierId: dto.supplierId },
        });
        if (!invited) {
            throw new common_1.BadRequestException('Supplier is not invited to this RFQ');
        }
        const existing = await this.prisma.supplierQuotationHeader.findFirst({
            where: { rfqId: dto.rfqId, supplierId: dto.supplierId },
        });
        if (existing) {
            throw new common_1.BadRequestException('This supplier already has a quotation for this RFQ');
        }
        const quoteDate = dto.quoteDate ? new Date(dto.quoteDate) : new Date();
        return this.prisma.$transaction(async (tx) => {
            const quoteNumber = await this.numbers.nextShopScopedNumber(tx, {
                shopId: rfq.shopId,
                docType: 'QUO',
                basePrefix: 'QUO',
                date: quoteDate,
            });
            return tx.supplierQuotationHeader.create({
                data: {
                    quoteNumber,
                    quoteDate,
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
    async acceptAndAutoLink(user, id, dto = {}) {
        const quote = await this.get(user, id);
        const selectedItems = this.resolveAutoLinkItems(quote.items, dto.items);
        if (selectedItems.some(({ item }) => !item.productId)) {
            throw new common_1.BadRequestException('All quotation items must reference products for auto-linking');
        }
        if (quote.rfqId) {
            const missingRfqItem = selectedItems.find(({ item }) => !item.rfqItemId);
            if (missingRfqItem) {
                throw new common_1.BadRequestException('Quotation items must reference RFQ lines to create linked purchase orders');
            }
            await this.rfqs.assertCanCreatePoFromRfq({
                rfqId: quote.rfqId,
                shopId: quote.shopId,
                supplierName: quote.supplier.supplierName,
                items: selectedItems.map(({ item, orderQty }) => ({
                    rfqItemId: item.rfqItemId,
                    orderQty,
                })),
            });
        }
        return this.prisma.$transaction(async (tx) => {
            if (quote.rfqId) {
                await this.rfqs.assertCanCreatePoFromRfq({
                    tx,
                    rfqId: quote.rfqId,
                    shopId: quote.shopId,
                    supplierName: quote.supplier.supplierName,
                    items: selectedItems.map(({ item, orderQty }) => ({
                        rfqItemId: item.rfqItemId,
                        orderQty,
                    })),
                });
            }
            let contract = await tx.contractHeader.findFirst({ where: { quotationId: quote.id } });
            if (!contract) {
                const contractNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
                    shopId: quote.shopId,
                    docType: 'CT',
                    date: new Date(),
                });
                contract = await tx.contractHeader.create({
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
            }
            const selectedTotalValue = selectedItems.reduce((sum, { item, orderQty }) => sum.add(new client_1.Prisma.Decimal(orderQty).mul(item.unitPrice)), new client_1.Prisma.Decimal(0));
            const poNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
                shopId: quote.shopId,
                docType: 'PO',
                date: new Date(),
            });
            const purchaseOrder = await tx.purchaseOrderHeader.create({
                data: {
                    poNumber,
                    poDate: new Date(),
                    shopId: quote.shopId,
                    rfqId: quote.rfqId,
                    contractId: contract.id,
                    supplier: quote.supplier.supplierName,
                    status: client_1.PurchaseOrderStatus.CONFIRMED,
                    remarks: `Auto-generated from quotation ${quote.quoteNumber}`,
                    totalValue: selectedTotalValue,
                    createdById: user.id,
                    items: {
                        create: selectedItems.map(({ item, orderQty }) => ({
                            productId: item.productId,
                            rfqItemId: item.rfqItemId ?? null,
                            currentStock: new client_1.Prisma.Decimal(0),
                            minStock: new client_1.Prisma.Decimal(0),
                            suggestedQty: new client_1.Prisma.Decimal(orderQty),
                            orderQty: new client_1.Prisma.Decimal(orderQty),
                            rate: item.unitPrice,
                            lineValue: new client_1.Prisma.Decimal(orderQty).mul(item.unitPrice),
                            createdById: user.id,
                        })),
                    },
                },
            });
            const grNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
                shopId: quote.shopId,
                docType: 'GR',
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
                        create: selectedItems.map(({ item, orderQty }) => ({
                            productId: item.productId,
                            quantity: new client_1.Prisma.Decimal(orderQty),
                            uom: item.uom,
                            purchaseRate: item.unitPrice,
                            lineValue: new client_1.Prisma.Decimal(orderQty).mul(item.unitPrice),
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
    resolveAutoLinkItems(items, selection) {
        if (!selection?.length) {
            return items.map((item) => ({ item, orderQty: Number(item.quantity) }));
        }
        const byItemId = new Map(items.map((item) => [item.id, item]));
        const byRfqItemId = new Map(items
            .filter((item) => item.rfqItemId)
            .map((item) => [item.rfqItemId, item]));
        const seenItemIds = new Set();
        return selection.map((entry) => {
            const item = (entry.quotationItemId ? byItemId.get(entry.quotationItemId) : undefined) ??
                (entry.rfqItemId ? byRfqItemId.get(entry.rfqItemId) : undefined);
            if (!item) {
                throw new common_1.BadRequestException('Selected quotation line was not found');
            }
            if (seenItemIds.has(item.id)) {
                throw new common_1.BadRequestException('Duplicate quotation line in selection');
            }
            seenItemIds.add(item.id);
            const quotedQty = Number(item.quantity);
            if (entry.orderQty <= 0) {
                throw new common_1.BadRequestException('Selected PO quantity must be greater than zero');
            }
            if (entry.orderQty > quotedQty) {
                throw new common_1.BadRequestException('Selected PO quantity exceeds the supplier quotation quantity');
            }
            return { item, orderQty: entry.orderQty };
        });
    }
};
exports.QuotationsService = QuotationsService;
exports.QuotationsService = QuotationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_number_service_1.DocumentNumberService,
        rfqs_service_1.RfqsService])
], QuotationsService);
//# sourceMappingURL=quotations.service.js.map