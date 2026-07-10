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
exports.EmailNotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const mail_module_1 = require("../../common/mail/mail.module");
const pdf_module_1 = require("../../common/pdf/pdf.module");
const common_pdf_module_1 = require("../../common/pdf/common-pdf.module");
const prisma_module_1 = require("../../prisma/prisma.module");
const email_senders_module_1 = require("../email-senders/email-senders.module");
const email_notifications_controller_1 = require("./email-notifications.controller");
const email_notifications_service_1 = require("./email-notifications.service");
const payment_reminder_constants_1 = require("./payment-reminder.constants");
const payment_reminder_processor_1 = require("./payment-reminder.processor");
const payment_reminder_scheduler_1 = require("./payment-reminder.scheduler");
let EmailNotificationsModule = class EmailNotificationsModule {
    scheduler;
    constructor(scheduler) {
        this.scheduler = scheduler;
    }
    onModuleInit() {
        void this.scheduler.registerRepeatableJob();
    }
};
exports.EmailNotificationsModule = EmailNotificationsModule;
exports.EmailNotificationsModule = EmailNotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            mail_module_1.MailModule,
            pdf_module_1.PdfModule,
            common_pdf_module_1.CommonPdfModule,
            (0, common_1.forwardRef)(() => email_senders_module_1.EmailSendersModule),
            bullmq_1.BullModule.registerQueue({ name: payment_reminder_constants_1.PAYMENT_REMINDER_QUEUE }),
        ],
        controllers: [email_notifications_controller_1.EmailNotificationsController],
        providers: [email_notifications_service_1.EmailNotificationsService, payment_reminder_processor_1.PaymentReminderProcessor, payment_reminder_scheduler_1.PaymentReminderScheduler],
        exports: [email_notifications_service_1.EmailNotificationsService],
    }),
    __metadata("design:paramtypes", [payment_reminder_scheduler_1.PaymentReminderScheduler])
], EmailNotificationsModule);
//# sourceMappingURL=email-notifications.module.js.map