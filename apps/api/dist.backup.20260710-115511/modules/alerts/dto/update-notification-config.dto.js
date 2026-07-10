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
exports.UpdateNotificationConfigDto = exports.NotificationGroupDto = exports.NotificationRuleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const severityValues = ['URGENT', 'WARNING', 'ACTION', 'INFO'];
const channelValues = ['Email', 'SMS', 'In-app', 'WhatsApp'];
class NotificationRuleDto {
    id;
    title;
    notifyTo;
    severity;
    channels;
}
exports.NotificationRuleDto = NotificationRuleDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotificationRuleDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotificationRuleDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotificationRuleDto.prototype, "notifyTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: severityValues }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(severityValues),
    __metadata("design:type", Object)
], NotificationRuleDto.prototype, "severity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String], enum: channelValues }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.IsIn)(channelValues, { each: true }),
    __metadata("design:type", Array)
], NotificationRuleDto.prototype, "channels", void 0);
class NotificationGroupDto {
    id;
    title;
    moduleTags;
    rules;
}
exports.NotificationGroupDto = NotificationGroupDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotificationGroupDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotificationGroupDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], NotificationGroupDto.prototype, "moduleTags", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [NotificationRuleDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => NotificationRuleDto),
    __metadata("design:type", Array)
], NotificationGroupDto.prototype, "rules", void 0);
class UpdateNotificationConfigDto {
    groups;
    version;
}
exports.UpdateNotificationConfigDto = UpdateNotificationConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [NotificationGroupDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => NotificationGroupDto),
    __metadata("design:type", Array)
], UpdateNotificationConfigDto.prototype, "groups", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateNotificationConfigDto.prototype, "version", void 0);
//# sourceMappingURL=update-notification-config.dto.js.map