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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let PaymentsService = class PaymentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user) {
        return this.prisma.paymentReceipt.findMany({
            where: user.shopId ? { shopId: user.shopId } : undefined,
            orderBy: { receiptDate: 'desc' },
            include: { invoice: true, shop: true },
        });
    }
    async create(user, dto) {
        const invoice = await this.prisma.invoiceHeader.findUnique({ where: { id: dto.invoiceId } });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        (0, shop_scope_1.assertShopScope)(user, invoice.shopId);
        const count = await this.prisma.paymentReceipt.count({ where: { shopId: invoice.shopId } });
        const receiptNumber = dto.receiptNumber?.trim() || `RCPT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        const amount = new client_1.Prisma.Decimal(dto.amount ?? 0);
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.paymentReceipt.create({
                data: {
                    receiptNumber,
                    receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
                    invoiceId: invoice.id,
                    shopId: invoice.shopId,
                    amount,
                    method: dto.method ?? null,
                    reference: dto.reference ?? null,
                    remarks: dto.remarks ?? null,
                    createdById: user.id,
                },
                include: { invoice: true, shop: true },
            });
            const newPaid = new client_1.Prisma.Decimal(invoice.paidValue).add(amount);
            const status = newPaid.greaterThanOrEqualTo(invoice.totalValue) ? client_1.InvoiceStatus.PAID : client_1.InvoiceStatus.PARTIALLY_PAID;
            await tx.invoiceHeader.update({
                where: { id: invoice.id },
                data: {
                    paidValue: newPaid,
                    status,
                    updatedById: user.id,
                },
            });
            return payment;
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map