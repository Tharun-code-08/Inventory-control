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
var NotificationsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_2 = require("bullmq");
const job_failure_service_1 = require("../../common/queues/job-failure.service");
const metrics_service_1 = require("../../common/observability/metrics.service");
let NotificationsProcessor = NotificationsProcessor_1 = class NotificationsProcessor extends bullmq_1.WorkerHost {
    config;
    failures;
    metrics;
    logger = new common_1.Logger(NotificationsProcessor_1.name);
    constructor(config, failures, metrics) {
        super();
        this.config = config;
        this.failures = failures;
        this.metrics = metrics;
    }
    onCompleted(job) {
        const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
        this.metrics.bullJobDuration
            .labels('notifications', String(job.name), 'completed')
            .observe(Math.max(0, durationSec));
    }
    async process(job) {
        const url = this.config.get('NOTIFICATIONS_WEBHOOK_URL')?.trim();
        if (!url) {
            return { delivered: false };
        }
        const payload = {
            type: 'alert',
            alertEventId: job.data.alertEventId,
            alertType: job.data.alertType,
            title: job.data.title,
            message: job.data.message,
            shopId: job.data.shopId,
            severity: job.data.severity ?? 'MEDIUM',
            attempt: job.attemptsMade + 1,
            timestamp: new Date().toISOString(),
        };
        const controller = new AbortController();
        const timeoutMs = Number(this.config.get('NOTIFICATIONS_TIMEOUT_MS') ?? 5_000);
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, {
                method: 'POST',
                signal: controller.signal,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                throw new Error(`Webhook returned ${res.status}`);
            }
            return { delivered: true, statusCode: res.status };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async onFailed(job, err) {
        const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
        this.metrics.bullJobDuration
            .labels('notifications', String(job.name), 'failed')
            .observe(Math.max(0, durationSec));
        await this.failures.record(job, err);
    }
};
exports.NotificationsProcessor = NotificationsProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], NotificationsProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], NotificationsProcessor.prototype, "onFailed", null);
exports.NotificationsProcessor = NotificationsProcessor = NotificationsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('notifications'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        job_failure_service_1.JobFailureService,
        metrics_service_1.MetricsService])
], NotificationsProcessor);
//# sourceMappingURL=notifications.processor.js.map