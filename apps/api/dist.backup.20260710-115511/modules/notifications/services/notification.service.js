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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
let NotificationService = NotificationService_1 = class NotificationService {
    prisma;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, actorId, companyId) {
        const recipient = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });
        if (!recipient) {
            throw new common_1.NotFoundException('Recipient user not found');
        }
        const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + THIRTY_DAYS_MS);
        const notification = await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                companyId,
                title: dto.title,
                message: dto.message,
                type: dto.type,
                priority: dto.priority,
                module: dto.module,
                referenceType: dto.referenceType,
                referenceId: dto.referenceId,
                deepLink: dto.deepLink,
                actionUrl: dto.actionUrl,
                expiresAt,
                createdById: actorId ?? null,
            },
        });
        if (actorId) {
            await this.auditLog('NOTIFICATION_SENT', actorId, companyId, notification.id, {
                type: dto.type,
                priority: dto.priority,
                recipientId: dto.userId,
            });
        }
        return notification;
    }
    async getNotifications(userId, companyId, filter) {
        const page = filter.page || 1;
        const limit = filter.limit || 10;
        const skip = (page - 1) * limit;
        const where = {
            userId,
            companyId,
        };
        if (filter.isRead !== undefined) {
            where.isRead = filter.isRead;
        }
        if (filter.module) {
            where.module = filter.module;
        }
        if (filter.priority) {
            where.priority = filter.priority;
        }
        if (filter.type) {
            where.type = filter.type;
        }
        where.OR = [{ expiresAt: { gt: new Date() } }, { expiresAt: null }];
        const [notifications, total, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: filter.limit,
            }),
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({ where: { ...where, isRead: false } }),
        ]);
        return { data: notifications, total, unreadCount };
    }
    async markAsRead(notificationId, userId) {
        const notification = await this.prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        const updated = await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
                isRead: true,
                readAt: new Date(),
                status: client_1.NotificationStatus.READ,
            },
        });
        await this.auditLog('NOTIFICATION_READ', userId, notification.companyId, notificationId, {});
        return updated;
    }
    async markAllAsRead(userId, companyId) {
        const result = await this.prisma.notification.updateMany({
            where: {
                userId,
                companyId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
                status: client_1.NotificationStatus.READ,
            },
        });
        await this.auditLog('NOTIFICATIONS_READ_ALL', userId, companyId, null, {
            count: result.count,
        });
        return { updated: result.count };
    }
    async delete(notificationId, userId, companyId) {
        const notification = await this.prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        const deleted = await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
                status: client_1.NotificationStatus.DELETED,
            },
        });
        await this.auditLog('NOTIFICATION_DELETED', userId, companyId, notificationId, {});
        return deleted;
    }
    async getNotification(notificationId, userId) {
        const notification = await this.prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return notification;
    }
    async getUnreadCount(userId, companyId) {
        return this.prisma.notification.count({
            where: {
                userId,
                companyId,
                isRead: false,
                OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
            },
        });
    }
    async getNotificationsByReference(referenceType, referenceId, companyId) {
        return this.prisma.notification.findMany({
            where: {
                companyId,
                referenceType,
                referenceId,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deleteExpiredNotifications() {
        const result = await this.prisma.notification.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        this.logger.log(`Deleted ${result.count} expired notifications`);
        return { deleted: result.count };
    }
    async auditLog(action, userId, companyId, notificationId, details) {
        try {
            await this.prisma.notificationAuditLog.create({
                data: {
                    action,
                    userId,
                    companyId,
                    notificationId,
                    details: details || {},
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to record audit log for ${action}`, error);
        }
    }
    async notifyRoles(roles, payload, companyId, actorId) {
        let sent = 0;
        let failed = 0;
        for (const role of roles) {
            try {
                const result = await this.sendToRole({ ...payload, userId: actorId }, role, companyId, actorId);
                sent += result.sent;
                failed += result.failed;
            }
            catch (error) {
                this.logger.error(`notifyRoles failed for role ${role}`, error);
                failed += 1;
            }
        }
        return { sent, failed };
    }
    async sendToRole(dto, roleName, companyId, currentUserId) {
        const users = await this.prisma.user.findMany({
            where: {
                role: { name: roleName },
                shop: { companyId },
                isActive: true,
                deletedAt: null,
            },
            select: { id: true },
        });
        let sent = 0;
        let failed = 0;
        for (const user of users) {
            try {
                await this.create({ ...dto, userId: user.id }, currentUserId, companyId);
                sent++;
            }
            catch (error) {
                this.logger.error(`Failed to send notification to user ${user.id}`, error);
                failed++;
            }
        }
        return { sent, failed };
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map