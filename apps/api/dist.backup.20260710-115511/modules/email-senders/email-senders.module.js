"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSendersModule = void 0;
const common_1 = require("@nestjs/common");
const mail_module_1 = require("../../common/mail/mail.module");
const prisma_module_1 = require("../../prisma/prisma.module");
const email_sender_controller_1 = require("./email-sender.controller");
const email_sender_service_1 = require("./email-sender.service");
let EmailSendersModule = class EmailSendersModule {
};
exports.EmailSendersModule = EmailSendersModule;
exports.EmailSendersModule = EmailSendersModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, (0, common_1.forwardRef)(() => mail_module_1.MailModule)],
        controllers: [email_sender_controller_1.EmailSenderController],
        providers: [email_sender_service_1.EmailSenderService],
        exports: [email_sender_service_1.EmailSenderService],
    })
], EmailSendersModule);
//# sourceMappingURL=email-senders.module.js.map