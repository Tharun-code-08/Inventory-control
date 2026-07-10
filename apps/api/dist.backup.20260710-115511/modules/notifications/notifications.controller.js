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
var NotificationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const services_1 = require("./services");
const dto_1 = require("./dto");
let NotificationController = NotificationController_1 = class NotificationController {
    notificationService;
    preferenceService;
    logger = new common_1.Logger(NotificationController_1.name);
    constructor(notificationService, preferenceService) {
        this.notificationService = notificationService;
        this.preferenceService = preferenceService;
    }
    async createNotification(dto, user) {
        this.logger.debug(`Creating notification for user ${user.id}`);
        return this.notificationService.create(dto, user.id, user.companyId);
    }
    async getNotifications(filter, user) {
        const { data, total, unreadCount } = await this.notificationService.getNotifications(user.id, user.companyId, filter);
        const page = filter.page || 1;
        const limit = filter.limit || 20;
        const hasMore = page * limit < total;
        return {
            data: data,
            total,
            page,
            limit,
            unreadCount,
            hasMore,
        };
    }
    async getUnreadCount(user) {
        const count = await this.notificationService.getUnreadCount(user.id, user.companyId);
        return { count };
    }
    async getNotification(notificationId, user) {
        return this.notificationService.getNotification(notificationId, user.id);
    }
    async markAsRead(notificationId, user) {
        return this.notificationService.markAsRead(notificationId, user.id);
    }
    async markAllAsRead(user) {
        const result = await this.notificationService.markAllAsRead(user.id, user.companyId);
        return result;
    }
    async deleteNotification(notificationId, user) {
        return this.notificationService.delete(notificationId, user.id, user.companyId);
    }
    async getNotificationsByReference(referenceType, referenceId, user) {
        return this.notificationService.getNotificationsByReference(referenceType, referenceId, user.companyId);
    }
    async getMyPreferences(user) {
        return this.preferenceService.getOrCreatePreferences(user.id, user.companyId);
    }
    async getUserPreferences(userId) {
        return this.preferenceService.getPreferences(userId);
    }
    async updateMyPreferences(dto, user) {
        return this.preferenceService.updatePreferences(user.id, user.companyId, dto);
    }
    async updateUserPreferences(userId, dto, user) {
        return this.preferenceService.updatePreferences(user.id, user.companyId, dto);
    }
    async resetPreferences(userId, user) {
        return this.preferenceService.resetToDefaults(user.id, user.companyId);
    }
    async toggleAllPreferences(userId, body, user) {
        return this.preferenceService.bulkToggle(user.id, user.companyId, body.enable);
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create and send a notification' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: dto_1.NotificationResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateNotificationDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "createNotification", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get notifications for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationListResponseDto }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 20 }),
    (0, swagger_1.ApiQuery)({ name: 'isRead', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'module', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'priority', required: false, type: String }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.NotificationFilterDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('/unread/count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unread notification count' }),
    (0, swagger_1.ApiResponse)({ status: 200, schema: { properties: { count: { type: 'number' } } } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single notification' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationResponseDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotification", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Mark notification as read' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationResponseDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Patch)('/read-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all notifications as read' }),
    (0, swagger_1.ApiResponse)({ status: 200, schema: { properties: { updated: { type: 'number' } } } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a notification' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationResponseDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "deleteNotification", null);
__decorate([
    (0, common_1.Get)('/reference/:referenceType/:referenceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get notifications for a specific reference' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [dto_1.NotificationResponseDto] }),
    __param(0, (0, common_1.Param)('referenceType')),
    __param(1, (0, common_1.Param)('referenceId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotificationsByReference", null);
__decorate([
    (0, common_1.Get)('preferences/my'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user notification preferences' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationPreferenceResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getMyPreferences", null);
__decorate([
    (0, common_1.Get)('preferences/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user notification preferences (admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationPreferenceResponseDto }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUserPreferences", null);
__decorate([
    (0, common_1.Put)('preferences/my'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user notification preferences' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationPreferenceResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.UpdateNotificationPreferenceDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "updateMyPreferences", null);
__decorate([
    (0, common_1.Put)('preferences/:userId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update user notification preferences (admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationPreferenceResponseDto }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateNotificationPreferenceDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "updateUserPreferences", null);
__decorate([
    (0, common_1.Post)('preferences/:userId/reset'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reset user preferences to defaults' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationPreferenceResponseDto }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "resetPreferences", null);
__decorate([
    (0, common_1.Post)('preferences/:userId/toggle-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle all preferences for a user' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.NotificationPreferenceResponseDto }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "toggleAllPreferences", null);
exports.NotificationController = NotificationController = NotificationController_1 = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [services_1.NotificationService,
        services_1.NotificationPreferenceService])
], NotificationController);
//# sourceMappingURL=notifications.controller.js.map