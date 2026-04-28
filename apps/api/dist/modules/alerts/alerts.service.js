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
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let AlertsService = class AlertsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user) {
        return this.prisma.alertEvent.findMany({
            where: user.shopId ? { shopId: user.shopId } : undefined,
            orderBy: { triggeredAt: 'desc' },
            take: 100,
        });
    }
    async markRead(user, id) {
        return this.prisma.alertEvent.update({
            where: { id },
            data: { isRead: true, resolvedAt: new Date() },
        });
    }
    async runAutomationChecks() {
        const events = [];
        const lowStock = await this.prisma.stockSummary.findMany({
            where: { currentStock: { lt: 1 } },
            include: { product: true },
            take: 200,
        });
        for (const row of lowStock) {
            events.push({
                alertType: client_1.AlertType.LOW_STOCK,
                title: `Low stock: ${row.product.productCode}`,
                message: `${row.product.description} is below minimum stock level.`,
                shopId: row.shopId,
            });
        }
        const expiringContracts = await this.prisma.contractHeader.findMany({
            where: {
                endDate: {
                    lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                    gte: new Date(),
                },
            },
            take: 200,
        });
        for (const row of expiringContracts) {
            events.push({
                alertType: client_1.AlertType.CONTRACT_EXPIRY,
                title: `Contract expiring: ${row.contractNumber}`,
                message: `Contract ${row.title} is expiring soon.`,
                shopId: row.shopId,
            });
        }
        const overduePo = await this.prisma.purchaseOrderHeader.findMany({
            where: {
                status: { in: [client_1.PurchaseOrderStatus.DRAFT, client_1.PurchaseOrderStatus.CONFIRMED] },
                poDate: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
            },
            take: 200,
        });
        for (const row of overduePo) {
            events.push({
                alertType: client_1.AlertType.PO_OVERDUE,
                title: `PO overdue: ${row.poNumber}`,
                message: `Purchase order is pending beyond expected timeline.`,
                shopId: row.shopId,
            });
        }
        if (events.length > 0) {
            await this.prisma.alertEvent.createMany({
                data: events.map((evt) => ({
                    alertType: evt.alertType,
                    title: evt.title,
                    message: evt.message,
                    shopId: evt.shopId,
                    severity: 'HIGH',
                })),
                skipDuplicates: false,
            });
        }
        return { generated: events.length };
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AlertsService);
//# sourceMappingURL=alerts.service.js.map