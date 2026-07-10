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
exports.SubscriptionLifecycleModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const mail_module_1 = require("../../common/mail/mail.module");
const pdf_module_1 = require("../../common/pdf/pdf.module");
const prisma_module_1 = require("../../prisma/prisma.module");
const email_notifications_module_1 = require("../email-notifications/email-notifications.module");
const platform_notifications_module_1 = require("../platform-notifications/platform-notifications.module");
const engagement_tracker_service_1 = require("./engagement-tracker.service");
const lifecycle_orchestrator_service_1 = require("./lifecycle-orchestrator.service");
const platform_lifecycle_mail_service_1 = require("./platform-lifecycle-mail.service");
const subscription_invoice_service_1 = require("./subscription-invoice.service");
const subscription_lifecycle_processor_1 = require("./subscription-lifecycle.processor");
const subscription_lifecycle_scheduler_1 = require("./subscription-lifecycle.scheduler");
const subscription_lifecycle_constants_1 = require("./subscription-lifecycle.constants");
let SubscriptionLifecycleModule = class SubscriptionLifecycleModule {
    scheduler;
    constructor(scheduler) {
        this.scheduler = scheduler;
    }
    onModuleInit() {
        void this.scheduler.registerRepeatableJob();
    }
};
exports.SubscriptionLifecycleModule = SubscriptionLifecycleModule;
exports.SubscriptionLifecycleModule = SubscriptionLifecycleModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            mail_module_1.MailModule,
            pdf_module_1.PdfModule,
            email_notifications_module_1.EmailNotificationsModule,
            platform_notifications_module_1.PlatformNotificationsModule,
            bullmq_1.BullModule.registerQueue({ name: subscription_lifecycle_constants_1.SUBSCRIPTION_LIFECYCLE_QUEUE }),
        ],
        providers: [
            subscription_invoice_service_1.SubscriptionInvoiceService,
            platform_lifecycle_mail_service_1.PlatformLifecycleMailService,
            lifecycle_orchestrator_service_1.LifecycleOrchestratorService,
            engagement_tracker_service_1.EngagementTrackerService,
            subscription_lifecycle_processor_1.SubscriptionLifecycleProcessor,
            subscription_lifecycle_scheduler_1.SubscriptionLifecycleScheduler,
        ],
        exports: [
            subscription_invoice_service_1.SubscriptionInvoiceService,
            lifecycle_orchestrator_service_1.LifecycleOrchestratorService,
            engagement_tracker_service_1.EngagementTrackerService,
            platform_lifecycle_mail_service_1.PlatformLifecycleMailService,
        ],
    }),
    __metadata("design:paramtypes", [subscription_lifecycle_scheduler_1.SubscriptionLifecycleScheduler])
], SubscriptionLifecycleModule);
//# sourceMappingURL=subscription-lifecycle.module.js.map