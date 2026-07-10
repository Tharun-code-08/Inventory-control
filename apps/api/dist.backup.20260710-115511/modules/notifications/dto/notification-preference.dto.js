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
exports.UpdateNotificationPreferenceDto = exports.NotificationPreferenceResponseDto = exports.NotificationPreferenceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class NotificationPreferenceDto {
    grCreated = true;
    grApproved = true;
    grRejected = true;
    poApprovalRequired = true;
    poApproved = true;
    poRejected = true;
    lowStockAlert = true;
    transferCompleted = true;
    inventoryAdjustment = true;
    loginAlert = true;
    deviceAlert = true;
    pushEnabled = true;
    emailEnabled = false;
}
exports.NotificationPreferenceDto = NotificationPreferenceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when Goods Receipt is created',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "grCreated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when Goods Receipt is approved',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "grApproved", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when Goods Receipt is rejected',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "grRejected", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when PO approval is required',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "poApprovalRequired", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when PO is approved',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "poApproved", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when PO is rejected',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "poRejected", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive low stock alerts',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "lowStockAlert", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when transfer is completed',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "transferCompleted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications for inventory adjustments',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "inventoryAdjustment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive login alerts',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "loginAlert", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive device alerts',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "deviceAlert", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable push notifications',
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "pushEnabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable email notifications',
        default: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationPreferenceDto.prototype, "emailEnabled", void 0);
class NotificationPreferenceResponseDto extends NotificationPreferenceDto {
    id;
    userId;
    companyId;
    createdAt;
    updatedAt;
}
exports.NotificationPreferenceResponseDto = NotificationPreferenceResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NotificationPreferenceResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NotificationPreferenceResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NotificationPreferenceResponseDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], NotificationPreferenceResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], NotificationPreferenceResponseDto.prototype, "updatedAt", void 0);
class UpdateNotificationPreferenceDto {
    grCreated;
    grApproved;
    grRejected;
    poApprovalRequired;
    poApproved;
    poRejected;
    lowStockAlert;
    transferCompleted;
    inventoryAdjustment;
    loginAlert;
    deviceAlert;
    pushEnabled;
    emailEnabled;
}
exports.UpdateNotificationPreferenceDto = UpdateNotificationPreferenceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when Goods Receipt is created',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "grCreated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when Goods Receipt is approved',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "grApproved", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when Goods Receipt is rejected',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "grRejected", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when PO approval is required',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "poApprovalRequired", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when PO is approved',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "poApproved", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when PO is rejected',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "poRejected", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive low stock alerts',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "lowStockAlert", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications when transfer is completed',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "transferCompleted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive notifications for inventory adjustments',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "inventoryAdjustment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive login alerts',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "loginAlert", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Receive device alerts',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "deviceAlert", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable push notifications',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "pushEnabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable email notifications',
        required: false,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateNotificationPreferenceDto.prototype, "emailEnabled", void 0);
//# sourceMappingURL=notification-preference.dto.js.map