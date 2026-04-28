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
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let InvoicesService = class InvoicesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user) {
        return this.prisma.invoiceHeader.findMany({
            where: user.shopId ? { shopId: user.shopId } : undefined,
            orderBy: { invoiceDate: 'desc' },
            include: { customer: true, salesOrder: true, payments: true },
        });
    }
    async create(user, dto) {
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        (0, shop_scope_1.assertShopScope)(user, shopId);
        const count = await this.prisma.invoiceHeader.count({ where: { shopId } });
        const invoiceNumber = dto.invoiceNumber?.trim() || `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        return this.prisma.invoiceHeader.create({
            data: {
                invoiceNumber,
                invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
                salesOrderId: dto.salesOrderId ?? null,
                customerId: dto.customerId,
                shopId,
                status: client_1.InvoiceStatus.ISSUED,
                totalValue: new client_1.Prisma.Decimal(dto.totalValue ?? 0),
                paidValue: new client_1.Prisma.Decimal(0),
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                remarks: dto.remarks ?? null,
                createdById: user.id,
            },
            include: { customer: true, salesOrder: true, payments: true },
        });
    }
    async get(user, id) {
        const invoice = await this.prisma.invoiceHeader.findUnique({
            where: { id },
            include: { customer: true, salesOrder: true, payments: true },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        (0, shop_scope_1.assertShopScope)(user, invoice.shopId);
        return invoice;
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map