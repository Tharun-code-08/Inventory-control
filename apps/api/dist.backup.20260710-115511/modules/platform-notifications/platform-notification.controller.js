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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformNotificationController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const platform_admin_guard_1 = require("../platform/platform-admin.guard");
const platform_audit_service_1 = require("../platform/platform-audit.service");
const platform_health_service_1 = require("./platform-health.service");
const platform_notification_service_1 = require("./platform-notification.service");
let PlatformNotificationController = class PlatformNotificationController {
    notifications;
    health;
    platformAudit;
    constructor(notifications, health, platformAudit) {
        this.notifications = notifications;
        this.health = health;
        this.platformAudit = platformAudit;
    }
    list(user, unreadOnly, limit) {
        return this.notifications.listForAdmin(user.email, {
            unreadOnly: unreadOnly === 'true',
            limit: limit ? Number(limit) : undefined,
        });
    }
    unreadCount(user) {
        return this.notifications.unreadCount(user.email);
    }
    async markRead(user, id) {
        const result = await this.notifications.markRead(user.email, id);
        await this.platformAudit.logPlatformAction({
            userId: user.id,
            adminEmail: user.email,
            action: 'platform_notification_read',
            entityType: 'PlatformNotification',
            entityId: id,
            auditAction: client_1.AuditAction.UPDATE,
        });
        return result;
    }
    async markAllRead(user) {
        const result = await this.notifications.markAllRead(user.email);
        await this.platformAudit.logPlatformAction({
            userId: user.id,
            adminEmail: user.email,
            action: 'platform_notification_read_all',
            entityType: 'PlatformNotification',
            entityId: user.id,
            auditAction: client_1.AuditAction.UPDATE,
        });
        return result;
    }
    async healthSnapshot(user) {
        await this.platformAudit.logPlatformAction({
            userId: user.id,
            adminEmail: user.email,
            action: 'platform_health_view',
        });
        return this.health.collectSnapshot();
    }
};
exports.PlatformNotificationController = PlatformNotificationController;
__decorate([
    (0, common_1.Get)('notifications'),
    (0, swagger_1.ApiOperation)({ summary: 'Platform admin notification inbox' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('unreadOnly')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PlatformNotificationController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('notifications/unread-count'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PlatformNotificationController.prototype, "unreadCount", null);
__decorate([
    (0, common_1.Post)('notifications/:id/read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PlatformNotificationController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)('notifications/read-all'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlatformNotificationController.prototype, "markAllRead", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Platform infrastructure health snapshot' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlatformNotificationController.prototype, "healthSnapshot", null);
exports.PlatformNotificationController = PlatformNotificationController = __decorate([
    (0, swagger_1.ApiTags)('platform'),
    (0, common_1.Controller)('platform'),
    (0, common_1.UseGuards)(platform_admin_guard_1.PlatformAdminGuard),
    __metadata("design:paramtypes", [platform_notification_service_1.PlatformNotificationService,
        platform_health_service_1.PlatformHealthService,
        platform_audit_service_1.PlatformAuditService])
], PlatformNotificationController);
//# sourceMappingURL=platform-notification.controller.js.map