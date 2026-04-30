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
const CONFIG_KEY_PREFIX = 'notifications_matrix_config_v1';
const defaultNotificationConfig = {
    version: '1.0',
    groups: [
        {
            id: 'procurement',
            title: 'Procurement',
            moduleTags: ['RFQs', 'Quotations', 'Contracts', 'Purchase Orders'],
            rules: [
                {
                    id: 'rfq_submitted',
                    title: 'New RFQ submitted and awaiting supplier responses',
                    notifyTo: 'Purchase Manager',
                    severity: 'ACTION',
                    channels: ['Email', 'In-app'],
                },
                {
                    id: 'rfq_deadline',
                    title: 'RFQ response deadline approaching (24 hrs)',
                    notifyTo: 'Procurement Team',
                    severity: 'WARNING',
                    channels: ['Email', 'SMS'],
                },
                {
                    id: 'po_pending_approval',
                    title: 'New PO pending approval (above threshold)',
                    notifyTo: 'Finance Head, Management',
                    severity: 'ACTION',
                    channels: ['Email', 'In-app'],
                },
            ],
        },
        {
            id: 'inventory_warehouse',
            title: 'Inventory & Warehouse',
            moduleTags: ['Products', 'Goods Receipt', 'Goods Issue', 'Warehouse'],
            rules: [
                {
                    id: 'low_stock',
                    title: 'Low stock threshold breached',
                    notifyTo: 'Store Keeper, Inventory Manager',
                    severity: 'URGENT',
                    channels: ['In-app', 'Email'],
                },
            ],
        },
        {
            id: 'finance',
            title: 'Finance',
            moduleTags: ['Invoices', 'Payments'],
            rules: [
                {
                    id: 'invoice_overdue',
                    title: 'Invoice overdue for collection',
                    notifyTo: 'Accounts Team',
                    severity: 'WARNING',
                    channels: ['Email'],
                },
            ],
        },
    ],
};
let AlertsService = class AlertsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    configKey(shopId) {
        return `${CONFIG_KEY_PREFIX}:${shopId ?? 'global'}`;
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
    async getNotificationConfig(user) {
        const key = this.configKey(user.shopId);
        const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
        if (!setting) {
            return defaultNotificationConfig;
        }
        return setting.value;
    }
    async updateNotificationConfig(user, dto) {
        const key = this.configKey(user.shopId);
        const value = {
            version: dto.version ?? '1.0',
            groups: dto.groups.map((group) => ({
                id: group.id,
                title: group.title,
                moduleTags: [...group.moduleTags],
                rules: group.rules.map((rule) => ({
                    id: rule.id,
                    title: rule.title,
                    notifyTo: rule.notifyTo,
                    severity: rule.severity,
                    channels: [...rule.channels],
                })),
            })),
            updatedAt: new Date().toISOString(),
            updatedBy: user.id,
        };
        const saved = await this.prisma.systemSetting.upsert({
            where: { key },
            update: { value, updatedById: user.id },
            create: { key, value, createdById: user.id, updatedById: user.id },
        });
        return saved.value;
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