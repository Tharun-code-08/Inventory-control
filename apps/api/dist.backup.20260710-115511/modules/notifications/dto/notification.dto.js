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
exports.NotificationListResponseDto = exports.NotificationFilterDto = exports.UpdateNotificationStatusDto = exports.MarkAsReadDto = exports.NotificationResponseDto = exports.CreateNotificationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateNotificationDto {
    title;
    message;
    type;
    priority = client_1.NotificationPriority.NORMAL;
    module;
    referenceType;
    referenceId;
    deepLink;
    actionUrl;
    userId;
    expiresAt;
}
exports.CreateNotificationDto = CreateNotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Title of the notification',
        example: 'Stock Out Alert',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Message body of the notification',
        example: 'Product SKU-001 is out of stock',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.AlertType,
        description: 'Type of notification',
        example: 'LOW_STOCK',
    }),
    (0, class_validator_1.IsEnum)(client_1.AlertType),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.NotificationPriority,
        description: 'Priority level of the notification',
        example: 'HIGH',
    }),
    (0, class_validator_1.IsEnum)(client_1.NotificationPriority),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.NotificationModule,
        description: 'Module that triggered this notification',
        example: 'INVENTORY',
    }),
    (0, class_validator_1.IsEnum)(client_1.NotificationModule),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "module", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type of reference (e.g., product, goods_receipt)',
        example: 'product',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "referenceType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the referenced entity',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "referenceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Deep link URL to open the relevant screen',
        example: '/products/550e8400-e29b-41d4-a716-446655440000',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "deepLink", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Action URL for external actions',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "actionUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID to send notification to',
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the notification should expire (30 days from now by default)',
        required: false,
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "expiresAt", void 0);
class NotificationResponseDto {
    id;
    userId;
    companyId;
    title;
    message;
    type;
    priority;
    module;
    status;
    referenceType;
    referenceId;
    deepLink;
    actionUrl;
    isRead;
    readAt;
    createdAt;
    expiresAt;
}
exports.NotificationResponseDto = NotificationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NotificationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NotificationResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NotificationResponseDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NotificationResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NotificationResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AlertType }),
    __metadata("design:type", String)
], NotificationResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.NotificationPriority }),
    __metadata("design:type", String)
], NotificationResponseDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.NotificationModule }),
    __metadata("design:type", String)
], NotificationResponseDto.prototype, "module", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.NotificationStatus }),
    __metadata("design:type", String)
], NotificationResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], NotificationResponseDto.prototype, "referenceType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], NotificationResponseDto.prototype, "referenceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], NotificationResponseDto.prototype, "deepLink", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], NotificationResponseDto.prototype, "actionUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], NotificationResponseDto.prototype, "isRead", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], NotificationResponseDto.prototype, "readAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], NotificationResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], NotificationResponseDto.prototype, "expiresAt", void 0);
class MarkAsReadDto {
    notificationId;
}
exports.MarkAsReadDto = MarkAsReadDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Notification ID to mark as read',
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MarkAsReadDto.prototype, "notificationId", void 0);
class UpdateNotificationStatusDto {
    status;
}
exports.UpdateNotificationStatusDto = UpdateNotificationStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.NotificationStatus,
        description: 'New status for the notification',
    }),
    (0, class_validator_1.IsEnum)(client_1.NotificationStatus),
    __metadata("design:type", String)
], UpdateNotificationStatusDto.prototype, "status", void 0);
class NotificationFilterDto {
    isRead;
    module;
    priority;
    type;
    page = 1;
    limit = 20;
}
exports.NotificationFilterDto = NotificationFilterDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filter by read status',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], NotificationFilterDto.prototype, "isRead", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filter by module',
        enum: client_1.NotificationModule,
        required: false,
    }),
    (0, class_validator_1.IsEnum)(client_1.NotificationModule),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NotificationFilterDto.prototype, "module", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filter by priority',
        enum: client_1.NotificationPriority,
        required: false,
    }),
    (0, class_validator_1.IsEnum)(client_1.NotificationPriority),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NotificationFilterDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filter by notification type',
        enum: client_1.AlertType,
        required: false,
    }),
    (0, class_validator_1.IsEnum)(client_1.AlertType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NotificationFilterDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Pagination: page number',
        required: false,
        default: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], NotificationFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Pagination: items per page',
        required: false,
        default: 20,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], NotificationFilterDto.prototype, "limit", void 0);
class NotificationListResponseDto {
    data;
    total;
    page;
    limit;
    unreadCount;
    hasMore;
}
exports.NotificationListResponseDto = NotificationListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [NotificationResponseDto] }),
    __metadata("design:type", Array)
], NotificationListResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], NotificationListResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], NotificationListResponseDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], NotificationListResponseDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], NotificationListResponseDto.prototype, "unreadCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], NotificationListResponseDto.prototype, "hasMore", void 0);
//# sourceMappingURL=notification.dto.js.map