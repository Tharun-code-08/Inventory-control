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
exports.EmailNotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const strip_readonly_body_interceptor_1 = require("../../common/interceptors/strip-readonly-body.interceptor");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const update_email_notifications_dto_1 = require("./dto/update-email-notifications.dto");
const email_notifications_service_1 = require("./email-notifications.service");
let EmailNotificationsController = class EmailNotificationsController {
    emailNotifications;
    constructor(emailNotifications) {
        this.emailNotifications = emailNotifications;
    }
    list(user, shopId) {
        return this.emailNotifications.getEffectiveConfig(user, shopId?.trim() || null);
    }
    updateCompanyDefaults(user, dto) {
        return this.emailNotifications.saveCompanyDefaults(user, dto);
    }
    updateShopOverrides(user, shopId, dto) {
        return this.emailNotifications.saveShopOverrides(user, shopId, dto);
    }
    preview(user, dto) {
        return this.emailNotifications.previewTemplate(user, dto);
    }
};
exports.EmailNotificationsController = EmailNotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shopId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EmailNotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_email_notifications_dto_1.UpdateEmailNotificationsDto]),
    __metadata("design:returntype", void 0)
], EmailNotificationsController.prototype, "updateCompanyDefaults", null);
__decorate([
    (0, common_1.Put)('shops/:shopId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shopId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_email_notifications_dto_1.UpdateEmailNotificationsDto]),
    __metadata("design:returntype", void 0)
], EmailNotificationsController.prototype, "updateShopOverrides", null);
__decorate([
    (0, common_1.Post)('preview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_email_notifications_dto_1.PreviewEmailTemplateDto]),
    __metadata("design:returntype", void 0)
], EmailNotificationsController.prototype, "preview", null);
exports.EmailNotificationsController = EmailNotificationsController = __decorate([
    (0, swagger_1.ApiTags)('settings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseInterceptors)(new strip_readonly_body_interceptor_1.StripReadonlyBodyInterceptor()),
    (0, common_1.Controller)('settings/email-notifications'),
    __metadata("design:paramtypes", [email_notifications_service_1.EmailNotificationsService])
], EmailNotificationsController);
//# sourceMappingURL=email-notifications.controller.js.map