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
exports.SupplierPortalService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const document_number_service_1 = require("../stock/document-number.service");
const subscription_service_1 = require("../billing/subscription.service");
const notification_service_1 = require("../notifications/services/notification.service");
let SupplierPortalService = class SupplierPortalService {
    prisma;
    numbers;
    subscriptions;
    notifications;
    constructor(prisma, numbers, subscriptions, notifications) {
        this.prisma = prisma;
        this.numbers = numbers;
        this.subscriptions = subscriptions;
        this.notifications = notifications;
    }
    async resolveSupplier(email) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            throw new common_1.BadRequestException('Email is required');
        }
        const suppliers = await this.prisma.supplier.findMany({
            where: {
                isActive: true,
                deletedAt: null,
                email: { equals: normalizedEmail, mode: 'insensitive' },
            },
            include: { company: true },
            take: 5,
        });
        if (suppliers.length === 0) {
            throw new common_1.UnauthorizedException('We could not verify your email. Check that it matches our supplier records.');
        }
        return suppliers[0];
    }
    async verify(dto) {
        const supplier = await this.resolveSupplier(dto.email);
        if (supplier.companyId) {
            await this.subscriptions.assertFeature(supplier.companyId, 'supplier_portal');
        }
        const openRfqs = await this.prisma.rfqHeader.findMany({
            where: {
                status: client_1.DocumentStatus.POSTED,
                suppliers: { some: { supplierId: supplier.id } },
            },
            orderBy: { postedAt: 'desc' },
            select: {
                id: true,
                rfqNumber: true,
                title: true,
                deadline: true,
                rfqDate: true,
            },
        });
        const resolveRfqId = (token) => {
            const trimmed = token.trim();
            if (!trimmed)
                return null;
            if (trimmed.includes('-'))
                return trimmed;
            const upper = trimmed.toUpperCase();
            const fromOpen = openRfqs.find((r) => r.id.replace(/-/g, '').toUpperCase().startsWith(upper));
            return fromOpen?.id ?? trimmed;
        };
        let selectedRfq = null;
        if (dto.rfqId) {
            const resolvedId = resolveRfqId(dto.rfqId);
            selectedRfq = openRfqs.find((r) => r.id === resolvedId) ?? null;
            if (!selectedRfq) {
                const linked = await this.prisma.rfqHeader.findFirst({
                    where: {
                        id: resolvedId ?? dto.rfqId,
                        status: client_1.DocumentStatus.POSTED,
                        suppliers: { some: { supplierId: supplier.id } },
                    },
                    select: {
                        id: true,
                        rfqNumber: true,
                        title: true,
                        deadline: true,
                        rfqDate: true,
                    },
                });
                if (!linked) {
                    throw new common_1.NotFoundException('RFQ not found or not available for your company');
                }
                selectedRfq = linked;
            }
        }
        return {
            supplier: {
                id: supplier.id,
                supplierName: supplier.supplierName,
                email: supplier.email,
            },
            openRfqs,
            selectedRfqId: selectedRfq?.id ?? openRfqs[0]?.id ?? null,
        };
    }
    async getRfqForSupplier(rfqId, supplierId) {
        const rfq = await this.prisma.rfqHeader.findFirst({
            where: {
                id: rfqId,
                status: client_1.DocumentStatus.POSTED,
                suppliers: { some: { supplierId } },
            },
            include: {
                shop: { select: { shopName: true } },
                items: {
                    include: {
                        product: { select: { productCode: true, description: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!rfq)
            throw new common_1.NotFoundException('RFQ not available');
        return rfq;
    }
    async submitQuote(dto) {
        const rfq = await this.getRfqForSupplier(dto.rfqId, dto.supplierId);
        const supplier = await this.prisma.supplier.findUnique({
            where: { id: dto.supplierId },
            select: { companyId: true },
        });
        if (supplier?.companyId) {
            await this.subscriptions.assertFeature(supplier.companyId, 'supplier_portal');
        }
        const itemMap = new Map(rfq.items.map((i) => [i.id, i]));
        if (dto.items.length !== rfq.items.length) {
            throw new common_1.BadRequestException('Unit price is required for every RFQ line item');
        }
        const lines = dto.items.map((line) => {
            const rfqItem = itemMap.get(line.rfqItemId);
            if (!rfqItem) {
                throw new common_1.BadRequestException(`Invalid line item ${line.rfqItemId}`);
            }
            const qty = Number(rfqItem.quantity);
            const unitPrice = line.unitPrice;
            if (!(unitPrice > 0)) {
                throw new common_1.BadRequestException(`Unit price must be greater than zero for line ${line.rfqItemId}`);
            }
            return {
                rfqItemId: rfqItem.id,
                productId: rfqItem.productId,
                description: rfqItem.description ?? rfqItem.product?.description ?? null,
                quantity: rfqItem.quantity,
                uom: rfqItem.uom,
                specifications: rfqItem.specifications,
                unitPrice: new client_1.Prisma.Decimal(unitPrice),
                lineValue: new client_1.Prisma.Decimal(qty * unitPrice),
            };
        });
        const notes = [
            dto.notes?.trim(),
            dto.leadTimeDays != null ? `Lead time: ${Math.round(dto.leadTimeDays)} days` : null,
            'Submitted via supplier portal',
        ]
            .filter(Boolean)
            .join('\n');
        const quoteDate = new Date();
        const created = await this.prisma.$transaction(async (tx) => {
            const quoteNumber = await this.numbers.nextShopScopedNumber(tx, {
                shopId: rfq.shopId,
                docType: 'QUO',
                basePrefix: 'QUO',
                date: quoteDate,
            });
            const quote = await tx.supplierQuotationHeader.create({
                data: {
                    quoteNumber,
                    quoteDate,
                    shopId: rfq.shopId,
                    rfqId: rfq.id,
                    supplierId: dto.supplierId,
                    notes: notes || null,
                    status: client_1.DocumentStatus.POSTED,
                    postedAt: new Date(),
                    items: {
                        create: lines.map((line) => ({
                            rfqItemId: line.rfqItemId,
                            productId: line.productId,
                            description: line.description,
                            quantity: line.quantity,
                            uom: line.uom,
                            specifications: line.specifications,
                            unitPrice: line.unitPrice,
                            lineValue: line.lineValue,
                        })),
                    },
                },
                include: { supplier: true, rfq: true, items: true },
            });
            const total = lines.reduce((sum, l) => sum + Number(l.lineValue), 0);
            return {
                quoteNumber: quote.quoteNumber,
                referenceCode: quote.quoteNumber,
                totalValue: total,
                status: quote.status,
                supplierName: quote.supplier?.supplierName ?? 'A supplier',
                rfqNumber: quote.rfq?.rfqNumber ?? null,
                rfqId: quote.rfqId,
            };
        });
        if (supplier?.companyId) {
            const rfqLabel = created.rfqNumber ? created.rfqNumber : 'an RFQ';
            await this.notifications
                .notifyRoles([client_1.RoleName.PURCHASE_MANAGER, client_1.RoleName.OWNER, client_1.RoleName.ADMIN], {
                title: 'New Bid Received',
                message: `${created.supplierName} submitted a quote for ${rfqLabel}`,
                type: client_1.AlertType.RFQ_RESPONSE_RECEIVED,
                module: client_1.NotificationModule.RFQ,
                priority: client_1.NotificationPriority.NORMAL,
                referenceType: 'rfq',
                referenceId: created.rfqId,
                deepLink: `/rfqs/${created.rfqId}`,
            }, supplier.companyId, null)
                .catch(() => undefined);
        }
        return {
            quoteNumber: created.quoteNumber,
            referenceCode: created.referenceCode,
            totalValue: created.totalValue,
            status: created.status,
        };
    }
};
exports.SupplierPortalService = SupplierPortalService;
exports.SupplierPortalService = SupplierPortalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_number_service_1.DocumentNumberService,
        subscription_service_1.SubscriptionService,
        notification_service_1.NotificationService])
], SupplierPortalService);
//# sourceMappingURL=supplier-portal.service.js.map