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
exports.PlatformNotificationsModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const mail_module_1 = require("../../common/mail/mail.module");
const observability_module_1 = require("../../common/observability/observability.module");
const prisma_module_1 = require("../../prisma/prisma.module");
const platform_admin_guard_1 = require("../platform/platform-admin.guard");
const platform_audit_service_1 = require("../platform/platform-audit.service");
const platform_notification_constants_1 = require("./platform-notification.constants");
const platform_check_processor_1 = require("./platform-check.processor");
const platform_check_scheduler_1 = require("./platform-check.scheduler");
const platform_health_service_1 = require("./platform-health.service");
const platform_notification_controller_1 = require("./platform-notification.controller");
const platform_notification_service_1 = require("./platform-notification.service");
const platform_revenue_service_1 = require("./platform-revenue.service");
let PlatformNotificationsModule = class PlatformNotificationsModule {
    scheduler;
    constructor(scheduler) {
        this.scheduler = scheduler;
    }
    onModuleInit() {
        void this.scheduler.registerRepeatableJobs();
    }
};
exports.PlatformNotificationsModule = PlatformNotificationsModule;
exports.PlatformNotificationsModule = PlatformNotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            mail_module_1.MailModule,
            observability_module_1.ObservabilityModule,
            bullmq_1.BullModule.registerQueue({ name: platform_notification_constants_1.PLATFORM_CHECKS_QUEUE }),
        ],
        controllers: [platform_notification_controller_1.PlatformNotificationController],
        providers: [
            platform_admin_guard_1.PlatformAdminGuard,
            platform_audit_service_1.PlatformAuditService,
            platform_notification_service_1.PlatformNotificationService,
            platform_revenue_service_1.PlatformRevenueService,
            platform_health_service_1.PlatformHealthService,
            platform_check_processor_1.PlatformCheckProcessor,
            platform_check_scheduler_1.PlatformCheckScheduler,
        ],
        exports: [platform_notification_service_1.PlatformNotificationService, platform_revenue_service_1.PlatformRevenueService, platform_health_service_1.PlatformHealthService],
    }),
    __metadata("design:paramtypes", [platform_check_scheduler_1.PlatformCheckScheduler])
], PlatformNotificationsModule);
//# sourceMappingURL=platform-notifications.module.js.map