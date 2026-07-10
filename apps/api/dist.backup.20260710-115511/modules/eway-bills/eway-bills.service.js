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
exports.EwayBillsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let EwayBillsService = class EwayBillsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    scopeWhere(user) {
        if (user.shopId)
            return { shopId: user.shopId };
        if (user.tenantShopIds.length)
            return { shopId: { in: user.tenantShopIds } };
        return { shopId: '00000000-0000-0000-0000-000000000000' };
    }
    async list(user, filter) {
        const where = {
            ...this.scopeWhere(user),
            ...(filter.status ? { status: filter.status } : {}),
            ...(filter.customerId ? { customerId: filter.customerId } : {}),
            ...(filter.fromDate || filter.toDate
                ? {
                    documentDate: {
                        ...(filter.fromDate ? { gte: new Date(filter.fromDate) } : {}),
                        ...(filter.toDate ? { lte: new Date(filter.toDate) } : {}),
                    },
                }
                : {}),
        };
        return this.prisma.ewayBill.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                invoice: { select: { invoiceNumber: true } },
                items: true,
            },
        });
    }
    async get(user, id) {
        const bill = await this.prisma.ewayBill.findFirst({
            where: { id, ...this.scopeWhere(user) },
            include: {
                invoice: { select: { invoiceNumber: true } },
                shop: { select: { shopName: true } },
                items: { orderBy: { productName: 'asc' } },
            },
        });
        if (!bill)
            throw new common_1.NotFoundException('E-way bill not found');
        return bill;
    }
    async create(user, dto) {
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        (0, shop_scope_1.assertShopScope)(user, shopId);
        const summary = this.summariseItems(dto.items ?? []);
        return this.prisma.ewayBill.create({
            data: {
                ewayBillNumber: this.draftNumber(),
                shopId,
                invoiceId: dto.invoiceId ?? null,
                salesOrderId: dto.salesOrderId ?? null,
                customerId: dto.customerId ?? null,
                status: client_1.EwayBillStatus.DRAFT,
                supplyType: dto.supplyType ?? 'OUTWARD',
                subType: dto.subType ?? client_1.EwaySubType.SUPPLY,
                transactionType: dto.transactionType ?? client_1.EwayTransactionType.REGULAR,
                documentType: dto.documentType ?? client_1.EwayDocumentType.TAX_INVOICE,
                documentNumber: dto.documentNumber,
                documentDate: new Date(dto.documentDate),
                fromGstin: dto.fromGstin ?? null,
                fromName: dto.fromName,
                fromAddress1: dto.fromAddress1 ?? null,
                fromAddress2: dto.fromAddress2 ?? null,
                fromPlace: dto.fromPlace ?? null,
                fromPincode: dto.fromPincode ?? null,
                fromStateCode: dto.fromStateCode ?? null,
                toGstin: dto.toGstin ?? null,
                toName: dto.toName,
                toAddress1: dto.toAddress1 ?? null,
                toAddress2: dto.toAddress2 ?? null,
                toPlace: dto.toPlace ?? null,
                toPincode: dto.toPincode ?? null,
                toStateCode: dto.toStateCode ?? null,
                transporterGstin: dto.transporterGstin ?? null,
                transporterName: dto.transporterName ?? null,
                transporterId: dto.transporterId ?? null,
                transportMode: dto.transportMode ?? 'ROAD',
                transDocNumber: dto.transDocNumber ?? null,
                transDocDate: dto.transDocDate ? new Date(dto.transDocDate) : null,
                vehicleNumber: dto.vehicleNumber ?? null,
                vehicleType: dto.vehicleType ?? client_1.EwayVehicleType.REGULAR,
                distanceKm: dto.distanceKm ?? null,
                taxableValue: summary.taxableValue,
                cgstValue: summary.cgst,
                sgstValue: summary.sgst,
                igstValue: summary.igst,
                cessValue: summary.cess,
                totalValue: summary.total,
                remarks: dto.remarks ?? null,
                createdById: user.id,
                items: {
                    create: (dto.items ?? []).map(this.mapItem),
                },
            },
            include: { items: true },
        });
    }
    async createFromInvoice(user, dto) {
        const invoice = await this.prisma.invoiceHeader.findFirst({
            where: {
                id: dto.invoiceId,
                ...(user.shopId
                    ? { shopId: user.shopId }
                    : user.tenantShopIds.length
                        ? { shopId: { in: user.tenantShopIds } }
                        : {}),
            },
            include: {
                customer: true,
                shop: true,
            },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        (0, shop_scope_1.assertShopScope)(user, invoice.shopId);
        const taxable = Number(invoice.totalValue) - Number(invoice.taxAmount);
        const lineItems = [
            {
                productName: `Invoice ${invoice.invoiceNumber}`,
                hsnCode: '',
                quantity: 1,
                unit: 'PCS',
                taxableAmount: taxable,
                gstRate: taxable > 0 ? (Number(invoice.taxAmount) / taxable) * 100 : 0,
                igst: Number(invoice.taxAmount),
                cgst: 0,
                sgst: 0,
                cess: 0,
                total: Number(invoice.totalValue),
            },
        ];
        const summary = this.summariseItems(lineItems);
        return this.prisma.ewayBill.create({
            data: {
                ewayBillNumber: this.draftNumber(),
                shopId: invoice.shopId,
                invoiceId: invoice.id,
                customerId: invoice.customerId ?? null,
                status: client_1.EwayBillStatus.DRAFT,
                supplyType: 'OUTWARD',
                subType: client_1.EwaySubType.SUPPLY,
                transactionType: client_1.EwayTransactionType.REGULAR,
                documentType: client_1.EwayDocumentType.TAX_INVOICE,
                documentNumber: invoice.invoiceNumber,
                documentDate: invoice.invoiceDate,
                fromGstin: invoice.shop.taxId ?? null,
                fromName: invoice.shop.shopName,
                fromAddress1: invoice.shop.address ?? null,
                toGstin: invoice.customer.taxId ?? null,
                toName: invoice.customer.customerName,
                toAddress1: invoice.customer.street ?? null,
                toPlace: invoice.customer.city ?? null,
                toPincode: invoice.customer.postalCode ?? null,
                toStateCode: invoice.customer.state ?? null,
                transporterGstin: dto.transporterGstin ?? null,
                transporterName: dto.transporterName ?? null,
                transportMode: dto.transportMode ?? 'ROAD',
                transDocNumber: dto.transDocNumber ?? null,
                transDocDate: dto.transDocDate ? new Date(dto.transDocDate) : null,
                vehicleNumber: dto.vehicleNumber ?? null,
                vehicleType: dto.vehicleType ?? client_1.EwayVehicleType.REGULAR,
                distanceKm: dto.distanceKm ?? null,
                taxableValue: summary.taxableValue,
                cgstValue: summary.cgst,
                sgstValue: summary.sgst,
                igstValue: summary.igst,
                cessValue: summary.cess,
                totalValue: summary.total,
                createdById: user.id,
                items: { create: lineItems.map(this.mapItem) },
            },
            include: { items: true },
        });
    }
    async update(user, id, dto) {
        const bill = await this.get(user, id);
        if (bill.status !== client_1.EwayBillStatus.DRAFT) {
            throw new common_1.BadRequestException('Only draft e-way bills can be edited');
        }
        const summary = dto.items ? this.summariseItems(dto.items) : null;
        return this.prisma.$transaction(async (tx) => {
            if (dto.items) {
                await tx.ewayBillItem.deleteMany({ where: { ewayBillId: id } });
            }
            return tx.ewayBill.update({
                where: { id },
                data: {
                    supplyType: dto.supplyType ?? undefined,
                    subType: dto.subType ?? undefined,
                    transactionType: dto.transactionType ?? undefined,
                    documentType: dto.documentType ?? undefined,
                    documentNumber: dto.documentNumber ?? undefined,
                    documentDate: dto.documentDate ? new Date(dto.documentDate) : undefined,
                    fromGstin: dto.fromGstin ?? undefined,
                    fromName: dto.fromName ?? undefined,
                    fromAddress1: dto.fromAddress1 ?? undefined,
                    fromAddress2: dto.fromAddress2 ?? undefined,
                    fromPlace: dto.fromPlace ?? undefined,
                    fromPincode: dto.fromPincode ?? undefined,
                    fromStateCode: dto.fromStateCode ?? undefined,
                    toGstin: dto.toGstin ?? undefined,
                    toName: dto.toName ?? undefined,
                    toAddress1: dto.toAddress1 ?? undefined,
                    toAddress2: dto.toAddress2 ?? undefined,
                    toPlace: dto.toPlace ?? undefined,
                    toPincode: dto.toPincode ?? undefined,
                    toStateCode: dto.toStateCode ?? undefined,
                    transporterGstin: dto.transporterGstin ?? undefined,
                    transporterName: dto.transporterName ?? undefined,
                    transporterId: dto.transporterId ?? undefined,
                    transportMode: dto.transportMode ?? undefined,
                    transDocNumber: dto.transDocNumber ?? undefined,
                    transDocDate: dto.transDocDate ? new Date(dto.transDocDate) : undefined,
                    vehicleNumber: dto.vehicleNumber ?? undefined,
                    vehicleType: dto.vehicleType ?? undefined,
                    distanceKm: dto.distanceKm ?? undefined,
                    ...(summary
                        ? {
                            taxableValue: summary.taxableValue,
                            cgstValue: summary.cgst,
                            sgstValue: summary.sgst,
                            igstValue: summary.igst,
                            cessValue: summary.cess,
                            totalValue: summary.total,
                        }
                        : {}),
                    remarks: dto.remarks ?? undefined,
                    updatedById: user.id,
                    ...(dto.items
                        ? { items: { create: dto.items.map(this.mapItem) } }
                        : {}),
                },
                include: { items: true },
            });
        });
    }
    async generate(user, id) {
        const bill = await this.get(user, id);
        if (bill.status !== client_1.EwayBillStatus.DRAFT) {
            throw new common_1.BadRequestException('E-way bill has already been generated or cancelled');
        }
        this.validateForGeneration(bill);
        return this.prisma.ewayBill.update({
            where: { id },
            data: {
                status: client_1.EwayBillStatus.GENERATED,
                ewayBillNumber: this.officialNumber(),
                generatedAt: new Date(),
                validUpto: this.validUpto(bill.distanceKm),
                updatedById: user.id,
            },
            include: { items: true },
        });
    }
    async cancel(user, id, reason) {
        const bill = await this.get(user, id);
        if (bill.status === client_1.EwayBillStatus.CANCELLED) {
            throw new common_1.BadRequestException('E-way bill is already cancelled');
        }
        return this.prisma.ewayBill.update({
            where: { id },
            data: {
                status: client_1.EwayBillStatus.CANCELLED,
                cancelledAt: new Date(),
                cancelReason: reason,
                updatedById: user.id,
            },
        });
    }
    async stats(user) {
        const grouped = await this.prisma.ewayBill.groupBy({
            by: ['status'],
            where: this.scopeWhere(user),
            _count: { _all: true },
        });
        const out = { draft: 0, generated: 0, cancelled: 0, expired: 0 };
        for (const row of grouped) {
            if (row.status === 'DRAFT')
                out.draft = row._count._all;
            else if (row.status === 'GENERATED')
                out.generated = row._count._all;
            else if (row.status === 'CANCELLED')
                out.cancelled = row._count._all;
            else if (row.status === 'EXPIRED')
                out.expired = row._count._all;
        }
        return out;
    }
    mapItem(item) {
        return {
            productId: item.productId ?? null,
            productName: item.productName,
            description: item.description ?? null,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unit: item.unit,
            taxableAmount: item.taxableAmount,
            gstRate: item.gstRate,
            cgst: item.cgst ?? 0,
            sgst: item.sgst ?? 0,
            igst: item.igst ?? 0,
            cess: item.cess ?? 0,
            total: item.total,
        };
    }
    summariseItems(items) {
        return items.reduce((acc, i) => ({
            taxableValue: acc.taxableValue + i.taxableAmount,
            cgst: acc.cgst + (i.cgst ?? 0),
            sgst: acc.sgst + (i.sgst ?? 0),
            igst: acc.igst + (i.igst ?? 0),
            cess: acc.cess + (i.cess ?? 0),
            total: acc.total + i.total,
        }), { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0 });
    }
    validateForGeneration(bill) {
        const errors = [];
        if (!bill.documentNumber)
            errors.push('Document number is required');
        if (!bill.documentDate)
            errors.push('Document date is required');
        if (!bill.fromGstin)
            errors.push('Dispatch From GSTIN is required');
        if (!bill.fromPincode)
            errors.push('Dispatch From PIN code is required');
        if (!bill.fromStateCode)
            errors.push('Dispatch From state is required');
        if (!bill.toPincode)
            errors.push('Ship To PIN code is required');
        if (!bill.toStateCode)
            errors.push('Ship To state is required');
        if (!bill.items?.length)
            errors.push('At least one item is required');
        const blankHsn = bill.items?.filter((i) => !i.hsnCode);
        if (blankHsn?.length)
            errors.push(`HSN code missing on ${blankHsn.length} item(s)`);
        const zeroQty = bill.items?.filter((i) => Number(i.quantity) <= 0);
        if (zeroQty?.length)
            errors.push(`Quantity must be > 0 on ${zeroQty.length} item(s)`);
        if (Number(bill.taxableValue) <= 0)
            errors.push('Taxable value must be > 0');
        if (!bill.transportMode)
            errors.push('Transport mode is required');
        if (bill.transportMode === 'ROAD' && !bill.vehicleNumber) {
            errors.push('Vehicle number is required for road transport');
        }
        if (!bill.distanceKm || bill.distanceKm <= 0)
            errors.push('Distance (km) is required');
        if (errors.length) {
            throw new common_1.BadRequestException({ message: 'Validation failed', errors });
        }
    }
    draftNumber() {
        return `DRFT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0')}`;
    }
    officialNumber() {
        let n = '';
        for (let i = 0; i < 12; i += 1)
            n += Math.floor(Math.random() * 10).toString();
        return n;
    }
    validUpto(distanceKm) {
        const days = Math.max(1, Math.ceil((distanceKm ?? 0) / 200));
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d;
    }
    async generatePdf(user, billId) {
        const bill = await this.get(user, billId);
        if (!bill)
            throw new common_1.NotFoundException('E-Way Bill not found');
        const { renderHtmlToPdfBuffer } = await Promise.resolve().then(() => require('../../common/pdf/html-to-pdf.service'));
        const { generateEwayBillHtml } = await Promise.resolve().then(() => require('./eway-bills.pdf'));
        const html = generateEwayBillHtml(bill);
        const pdf = await renderHtmlToPdfBuffer(html);
        return pdf;
    }
};
exports.EwayBillsService = EwayBillsService;
exports.EwayBillsService = EwayBillsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EwayBillsService);
//# sourceMappingURL=eway-bills.service.js.map