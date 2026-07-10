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
exports.PreviewEmailTemplateDto = exports.UpdateEmailNotificationsDto = exports.EmailInternalAlertsDto = exports.EmailRemindersDto = exports.EmailInternalAlertConfigDto = exports.EmailTemplateConfigDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const email_notifications_constants_1 = require("../email-notifications.constants");
class EmailTemplateConfigDto {
    enabled;
    subject;
    bodyText;
    bodyHtml;
    cc;
    bcc;
}
exports.EmailTemplateConfigDto = EmailTemplateConfigDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmailTemplateConfigDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailTemplateConfigDto.prototype, "subject", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailTemplateConfigDto.prototype, "bodyText", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailTemplateConfigDto.prototype, "bodyHtml", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], EmailTemplateConfigDto.prototype, "cc", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], EmailTemplateConfigDto.prototype, "bcc", void 0);
class EmailInternalAlertConfigDto {
    emailEnabled;
    recipients;
}
exports.EmailInternalAlertConfigDto = EmailInternalAlertConfigDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmailInternalAlertConfigDto.prototype, "emailEnabled", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], EmailInternalAlertConfigDto.prototype, "recipients", void 0);
class EmailRemindersDto {
    paymentReminderEnabled;
    paymentReminderDaysBefore;
}
exports.EmailRemindersDto = EmailRemindersDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmailRemindersDto.prototype, "paymentReminderEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(0, { each: true }),
    (0, class_validator_1.Max)(365, { each: true }),
    __metadata("design:type", Array)
], EmailRemindersDto.prototype, "paymentReminderDaysBefore", void 0);
class EmailInternalAlertsDto {
    lowStock;
    rfqDeadline;
    invoiceOverdue;
    goodsReceiptPosted;
}
exports.EmailInternalAlertsDto = EmailInternalAlertsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailInternalAlertConfigDto),
    __metadata("design:type", EmailInternalAlertConfigDto)
], EmailInternalAlertsDto.prototype, "lowStock", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailInternalAlertConfigDto),
    __metadata("design:type", EmailInternalAlertConfigDto)
], EmailInternalAlertsDto.prototype, "rfqDeadline", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailInternalAlertConfigDto),
    __metadata("design:type", EmailInternalAlertConfigDto)
], EmailInternalAlertsDto.prototype, "invoiceOverdue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailInternalAlertConfigDto),
    __metadata("design:type", EmailInternalAlertConfigDto)
], EmailInternalAlertsDto.prototype, "goodsReceiptPosted", void 0);
class UpdateEmailNotificationsDto {
    version;
    templates;
    reminders;
    internalAlerts;
}
exports.UpdateEmailNotificationsDto = UpdateEmailNotificationsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEmailNotificationsDto.prototype, "version", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateEmailNotificationsDto.prototype, "templates", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailRemindersDto),
    __metadata("design:type", EmailRemindersDto)
], UpdateEmailNotificationsDto.prototype, "reminders", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailInternalAlertsDto),
    __metadata("design:type", EmailInternalAlertsDto)
], UpdateEmailNotificationsDto.prototype, "internalAlerts", void 0);
class PreviewEmailTemplateDto {
    templateId;
    template;
    sampleContext;
}
exports.PreviewEmailTemplateDto = PreviewEmailTemplateDto;
__decorate([
    (0, class_validator_1.IsIn)([...email_notifications_constants_1.EMAIL_TEMPLATE_IDS]),
    __metadata("design:type", String)
], PreviewEmailTemplateDto.prototype, "templateId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailTemplateConfigDto),
    __metadata("design:type", EmailTemplateConfigDto)
], PreviewEmailTemplateDto.prototype, "template", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], PreviewEmailTemplateDto.prototype, "sampleContext", void 0);
//# sourceMappingURL=update-email-notifications.dto.js.map