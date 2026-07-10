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
var ConversationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bullmq_2 = require("bullmq");
const job_failure_service_1 = require("../../../common/queues/job-failure.service");
const metrics_service_1 = require("../../../common/observability/metrics.service");
const prisma_service_1 = require("../../../prisma/prisma.service");
const whatsapp_adapter_1 = require("../channels/whatsapp/whatsapp.adapter");
let ConversationProcessor = ConversationProcessor_1 = class ConversationProcessor extends bullmq_1.WorkerHost {
    prisma;
    adapter;
    failures;
    metrics;
    logger = new common_1.Logger(ConversationProcessor_1.name);
    constructor(prisma, adapter, failures, metrics) {
        super();
        this.prisma = prisma;
        this.adapter = adapter;
        this.failures = failures;
        this.metrics = metrics;
    }
    async process(job) {
        const message = await this.prisma.message.findUnique({
            where: { id: job.data.messageId },
            include: { conversation: { include: { userChannelLink: true } } },
        });
        if (!message || message.status === client_1.ChatMessageStatus.SENT) {
            return { sent: false };
        }
        if (!this.adapter.isConfigured()) {
            const error = 'WhatsApp adapter not configured; message not sent';
            await this.markFailed(message.id, error);
            throw new bullmq_2.UnrecoverableError(error);
        }
        const result = await this.adapter.sendText({
            to: message.conversation.userChannelLink.phoneNumber,
            body: message.body ?? '',
        });
        await this.prisma.message.update({
            where: { id: message.id },
            data: { status: client_1.ChatMessageStatus.SENT, waMessageId: result.providerMessageId, error: null },
        });
        return { sent: true, providerMessageId: result.providerMessageId };
    }
    onCompleted(job) {
        const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
        this.metrics.bullJobDuration
            .labels('whatsapp', String(job.name), 'completed')
            .observe(Math.max(0, durationSec));
    }
    async onFailed(job, err) {
        const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
        this.metrics.bullJobDuration
            .labels('whatsapp', String(job.name), 'failed')
            .observe(Math.max(0, durationSec));
        await this.failures.record(job, err);
        await this.markFailed(job.data.messageId, err.message).catch(() => undefined);
    }
    async markFailed(messageId, error) {
        await this.prisma.message.update({
            where: { id: messageId },
            data: { status: client_1.ChatMessageStatus.FAILED, error },
        });
    }
};
exports.ConversationProcessor = ConversationProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], ConversationProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], ConversationProcessor.prototype, "onFailed", null);
exports.ConversationProcessor = ConversationProcessor = ConversationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('whatsapp'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_adapter_1.WhatsAppAdapter,
        job_failure_service_1.JobFailureService,
        metrics_service_1.MetricsService])
], ConversationProcessor);
//# sourceMappingURL=conversation.processor.js.map