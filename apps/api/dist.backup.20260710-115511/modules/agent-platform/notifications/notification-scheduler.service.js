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
var NotificationSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSchedulerService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../../prisma/prisma.service");
const notification_jobs_1 = require("./notification-jobs");
let NotificationSchedulerService = NotificationSchedulerService_1 = class NotificationSchedulerService {
    prisma;
    config;
    queue;
    logger = new common_1.Logger(NotificationSchedulerService_1.name);
    constructor(prisma, config, queue) {
        this.prisma = prisma;
        this.config = config;
        this.queue = queue;
    }
    async onApplicationBootstrap() {
        if (!this.notificationsEnabled())
            return;
        try {
            await this.scheduleAll();
        }
        catch (err) {
            this.logger.error(`Failed to schedule notifications: ${err.message}`);
        }
    }
    async scheduleAll() {
        const companies = await this.prisma.company.findMany({ select: { id: true } });
        for (const company of companies) {
            await this.upsertRepeatable('daily_summary', company.id, this.dailyCron());
            await this.upsertRepeatable('low_stock_alert', company.id, this.lowStockCron());
            await this.upsertRepeatable('overdue_payment', company.id, this.overduePaymentCron());
        }
        this.logger.log(`Notification schedules registered for ${companies.length} company/companies`);
    }
    async upsertRepeatable(type, companyId, cron) {
        const jobId = `${type}:${companyId}`;
        await this.queue.add(type, { type, companyId }, {
            jobId,
            repeat: { pattern: cron },
            removeOnComplete: 50,
            removeOnFail: 20,
        });
    }
    async scheduleForCompany(companyId) {
        if (!this.notificationsEnabled())
            return;
        try {
            await this.upsertRepeatable('daily_summary', companyId, this.dailyCron());
            await this.upsertRepeatable('low_stock_alert', companyId, this.lowStockCron());
            await this.upsertRepeatable('overdue_payment', companyId, this.overduePaymentCron());
        }
        catch (err) {
            this.logger.error(`Failed to schedule notifications for company ${companyId}: ${err.message}`);
        }
    }
    notificationsEnabled() {
        return this.config.get('AGENT_NOTIFICATIONS_ENABLED') === 'true';
    }
    dailyCron() {
        return this.config.get('NOTIFICATION_DAILY_SUMMARY_CRON') ?? notification_jobs_1.DEFAULT_DAILY_SUMMARY_CRON;
    }
    lowStockCron() {
        return this.config.get('NOTIFICATION_LOW_STOCK_CRON') ?? notification_jobs_1.DEFAULT_LOW_STOCK_CRON;
    }
    overduePaymentCron() {
        return this.config.get('NOTIFICATION_OVERDUE_PAYMENT_CRON') ?? notification_jobs_1.DEFAULT_OVERDUE_PAYMENT_CRON;
    }
};
exports.NotificationSchedulerService = NotificationSchedulerService;
exports.NotificationSchedulerService = NotificationSchedulerService = NotificationSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)(notification_jobs_1.NOTIFICATION_QUEUE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        bullmq_2.Queue])
], NotificationSchedulerService);
//# sourceMappingURL=notification-scheduler.service.js.map