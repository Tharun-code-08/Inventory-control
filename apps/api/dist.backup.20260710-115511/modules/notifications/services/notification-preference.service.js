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
var NotificationPreferenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreferenceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let NotificationPreferenceService = NotificationPreferenceService_1 = class NotificationPreferenceService {
    prisma;
    logger = new common_1.Logger(NotificationPreferenceService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrCreatePreferences(userId, companyId) {
        let preferences = await this.prisma.notificationPreference.findUnique({
            where: { userId },
        });
        if (!preferences) {
            preferences = await this.prisma.notificationPreference.create({
                data: {
                    userId,
                    companyId,
                    grCreated: true,
                    grApproved: true,
                    grRejected: true,
                    poApprovalRequired: true,
                    poApproved: true,
                    poRejected: true,
                    lowStockAlert: true,
                    transferCompleted: true,
                    inventoryAdjustment: true,
                    loginAlert: true,
                    deviceAlert: true,
                    pushEnabled: true,
                    emailEnabled: false,
                },
            });
        }
        return preferences;
    }
    async getPreferences(userId) {
        const preferences = await this.prisma.notificationPreference.findUnique({
            where: { userId },
        });
        if (!preferences) {
            throw new common_1.NotFoundException('Notification preferences not found');
        }
        return preferences;
    }
    async updatePreferences(userId, companyId, dto) {
        await this.getOrCreatePreferences(userId, companyId);
        const preferences = await this.prisma.notificationPreference.update({
            where: { userId },
            data: {
                grCreated: dto.grCreated !== undefined ? dto.grCreated : undefined,
                grApproved: dto.grApproved !== undefined ? dto.grApproved : undefined,
                grRejected: dto.grRejected !== undefined ? dto.grRejected : undefined,
                poApprovalRequired: dto.poApprovalRequired !== undefined ? dto.poApprovalRequired : undefined,
                poApproved: dto.poApproved !== undefined ? dto.poApproved : undefined,
                poRejected: dto.poRejected !== undefined ? dto.poRejected : undefined,
                lowStockAlert: dto.lowStockAlert !== undefined ? dto.lowStockAlert : undefined,
                transferCompleted: dto.transferCompleted !== undefined ? dto.transferCompleted : undefined,
                inventoryAdjustment: dto.inventoryAdjustment !== undefined ? dto.inventoryAdjustment : undefined,
                loginAlert: dto.loginAlert !== undefined ? dto.loginAlert : undefined,
                deviceAlert: dto.deviceAlert !== undefined ? dto.deviceAlert : undefined,
                pushEnabled: dto.pushEnabled !== undefined ? dto.pushEnabled : undefined,
                emailEnabled: dto.emailEnabled !== undefined ? dto.emailEnabled : undefined,
            },
        });
        return preferences;
    }
    async shouldReceiveNotification(userId, companyId, notificationType) {
        const prefs = await this.getOrCreatePreferences(userId, companyId);
        const typeMap = {
            GOODS_RECEIPT_CREATED: 'grCreated',
            GOODS_RECEIPT_APPROVED: 'grApproved',
            GOODS_RECEIPT_REJECTED: 'grRejected',
            PURCHASE_ORDER_APPROVED: 'poApprovalRequired',
            PURCHASE_ORDER_APPROVED_AP: 'poApproved',
            PURCHASE_ORDER_REJECTED: 'poRejected',
            LOW_STOCK: 'lowStockAlert',
            CRITICAL_STOCK: 'lowStockAlert',
            WAREHOUSE_TRANSFER_COMPLETED: 'transferCompleted',
            INVENTORY_ADJUSTMENT_COMPLETED: 'inventoryAdjustment',
            NEW_DEVICE_LOGIN: 'deviceAlert',
            LOGIN_ATTEMPT_LOCKOUT: 'loginAlert',
        };
        const prefKey = typeMap[notificationType];
        if (!prefKey) {
            return true;
        }
        const pref = prefs[prefKey];
        return pref === true || pref === null;
    }
    async bulkToggle(userId, companyId, enable) {
        return this.updatePreferences(userId, companyId, {
            grCreated: enable,
            grApproved: enable,
            grRejected: enable,
            poApprovalRequired: enable,
            poApproved: enable,
            poRejected: enable,
            lowStockAlert: enable,
            transferCompleted: enable,
            inventoryAdjustment: enable,
            loginAlert: enable,
            deviceAlert: enable,
            pushEnabled: enable,
        });
    }
    async resetToDefaults(userId, companyId) {
        return this.updatePreferences(userId, companyId, {
            grCreated: true,
            grApproved: true,
            grRejected: true,
            poApprovalRequired: true,
            poApproved: true,
            poRejected: true,
            lowStockAlert: true,
            transferCompleted: true,
            inventoryAdjustment: true,
            loginAlert: true,
            deviceAlert: true,
            pushEnabled: true,
            emailEnabled: false,
        });
    }
};
exports.NotificationPreferenceService = NotificationPreferenceService;
exports.NotificationPreferenceService = NotificationPreferenceService = NotificationPreferenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationPreferenceService);
//# sourceMappingURL=notification-preference.service.js.map