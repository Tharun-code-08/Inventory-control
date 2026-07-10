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
exports.EmailSenderController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const email_sender_dto_1 = require("./dto/email-sender.dto");
const email_sender_service_1 = require("./email-sender.service");
let EmailSenderController = class EmailSenderController {
    emailSenders;
    constructor(emailSenders) {
        this.emailSenders = emailSenders;
    }
    list(user) {
        return this.emailSenders.listSenders(user);
    }
    create(user, dto) {
        return this.emailSenders.createSender(user, dto);
    }
    update(user, id, dto) {
        return this.emailSenders.updateSender(user, id, dto);
    }
    remove(user, id) {
        return this.emailSenders.deleteSender(user, id);
    }
    getDkim(user, domain) {
        return this.emailSenders.getDomainDkim(user, decodeURIComponent(domain));
    }
    validateDomain(user, domain) {
        return this.emailSenders.validateDomain(user, decodeURIComponent(domain));
    }
    sendVerification(user, id) {
        return this.emailSenders.sendVerificationOtp(user, id);
    }
    verifyOtp(user, id, dto) {
        return this.emailSenders.verifySenderOtp(user, id, dto.otpCode);
    }
    configureSmtp(user, id, dto) {
        return this.emailSenders.configureSenderSmtp(user, id, dto);
    }
    testSmtp(user, id, dto) {
        return this.emailSenders.testSenderSmtp(user, id, dto);
    }
    verifySavedSmtp(user, id) {
        return this.emailSenders.testSenderSmtp(user, id);
    }
};
exports.EmailSenderController = EmailSenderController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, email_sender_dto_1.CreateEmailSenderDto]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, email_sender_dto_1.UpdateEmailSenderDto]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('domains/:domain/dkim'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('domain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "getDkim", null);
__decorate([
    (0, common_1.Post)('domains/:domain/validate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('domain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "validateDomain", null);
__decorate([
    (0, common_1.Post)(':id/send-verification'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "sendVerification", null);
__decorate([
    (0, common_1.Post)(':id/verify-otp'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, email_sender_dto_1.VerifySenderOtpDto]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Put)(':id/smtp'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, email_sender_dto_1.ConfigureSenderSmtpDto]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "configureSmtp", null);
__decorate([
    (0, common_1.Post)(':id/smtp/test'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, email_sender_dto_1.ConfigureSenderSmtpDto]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "testSmtp", null);
__decorate([
    (0, common_1.Post)(':id/smtp/verify-saved'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EmailSenderController.prototype, "verifySavedSmtp", null);
exports.EmailSenderController = EmailSenderController = __decorate([
    (0, swagger_1.ApiTags)('settings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('settings/email-notifications/senders'),
    __metadata("design:paramtypes", [email_sender_service_1.EmailSenderService])
], EmailSenderController);
//# sourceMappingURL=email-sender.controller.js.map