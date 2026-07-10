"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentEmailModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const pdf_module_1 = require("../../common/pdf/pdf.module");
const common_pdf_module_1 = require("../../common/pdf/common-pdf.module");
const mail_module_1 = require("../../common/mail/mail.module");
const prisma_module_1 = require("../../prisma/prisma.module");
const email_notifications_module_1 = require("../email-notifications/email-notifications.module");
const document_email_constants_1 = require("./document-email.constants");
const document_email_processor_1 = require("./document-email.processor");
const document_email_service_1 = require("./document-email.service");
const return_image_storage_service_1 = require("../../common/upload/return-image-storage.service");
let DocumentEmailModule = class DocumentEmailModule {
};
exports.DocumentEmailModule = DocumentEmailModule;
exports.DocumentEmailModule = DocumentEmailModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            pdf_module_1.PdfModule,
            common_pdf_module_1.CommonPdfModule,
            mail_module_1.MailModule,
            email_notifications_module_1.EmailNotificationsModule,
            bullmq_1.BullModule.registerQueue({ name: document_email_constants_1.DOCUMENT_EMAIL_QUEUE }),
        ],
        providers: [document_email_service_1.DocumentEmailService, document_email_processor_1.DocumentEmailProcessor, return_image_storage_service_1.ReturnImageStorageService],
        exports: [document_email_service_1.DocumentEmailService],
    })
], DocumentEmailModule);
//# sourceMappingURL=document-email.module.js.map