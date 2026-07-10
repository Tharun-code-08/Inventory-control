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
var QueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const crypto = require("crypto");
const queue_config_1 = require("./queue.config");
const job_types_1 = require("./job-types");
let QueueService = QueueService_1 = class QueueService {
    config;
    logger = new common_1.Logger(QueueService_1.name);
    queues = new Map();
    queueEvents = new Map();
    workers = new Map();
    constructor(config) {
        this.config = config;
    }
    async onModuleInit() {
        await this.initializeQueues();
        this.logger.log('✓ BullMQ queues initialized');
    }
    async onModuleDestroy() {
        await this.closeQueues();
        this.logger.log('✓ BullMQ queues closed');
    }
    async initializeQueues() {
        for (const queueName of Object.values(job_types_1.QueueName)) {
            const queueConfig = this.config.getQueueConfig(queueName);
            const queue = new bullmq_1.Queue(queueName, {
                connection: queueConfig.connection,
            });
            this.queues.set(queueName, queue);
            const queueEvents = new bullmq_1.QueueEvents(queueName, {
                connection: queueConfig.connection,
            });
            this.queueEvents.set(queueName, queueEvents);
            queueEvents.on('error', (error) => {
                this.logger.error(`Queue ${queueName} error:`, error);
            });
            queueEvents.on('failed', ({ jobId, failedReason }) => {
                this.logger.warn(`Job ${jobId} failed: ${failedReason}`);
            });
            queueEvents.on('completed', ({ jobId }) => {
                this.logger.log(`Job ${jobId} completed`);
            });
            queueEvents.on('progress', ({ jobId, data }) => {
                this.logger.debug(`Job ${jobId} progress: ${data}%`);
            });
        }
    }
    async closeQueues() {
        for (const queue of this.queues.values()) {
            await queue.close();
        }
        for (const queueEvent of this.queueEvents.values()) {
            await queueEvent.close();
        }
        for (const worker of this.workers.values()) {
            await worker.close();
        }
    }
    generateDeterministicJobId(payload) {
        const hash = crypto
            .createHash('sha256')
            .update(JSON.stringify({
            tenantId: payload.tenantId,
            documentType: payload.documentType,
            referenceId: payload.referenceId || null,
            templateVersion: '1.0',
            metadata: payload.metadata || {},
        }))
            .digest('hex');
        return `${payload.documentType}-${hash.substring(0, 12)}`;
    }
    async queueJob(payload, forceRegenerate = false) {
        const queueName = (0, job_types_1.getQueueForDocumentType)(payload.documentType);
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue not found: ${queueName}`);
        }
        const jobConfig = job_types_1.QUEUE_CONFIG[queueName];
        const jobId = this.generateDeterministicJobId(payload);
        if (!forceRegenerate) {
            const existingJob = await queue.getJob(jobId);
            if (existingJob) {
                const state = await existingJob.getState();
                this.logger.log(`Job already exists: ${jobId} (state: ${state})`);
                return jobId;
            }
        }
        const job = await queue.add(payload.documentType, payload, {
            attempts: jobConfig.attempts,
            backoff: jobConfig.backoff,
            removeOnComplete: jobConfig.removeOnComplete,
            removeOnFail: jobConfig.removeOnFail,
            jobId,
        });
        this.logger.log(`Job queued: ${job.id} (${payload.documentType})`);
        return job.id || jobId;
    }
    async getJobStatus(jobId) {
        for (const queue of this.queues.values()) {
            const job = await queue.getJob(jobId);
            if (job) {
                let progress = 0;
                try {
                    const p = job.progress;
                    progress = typeof p === 'function' ? p() : typeof p === 'number' ? p : 0;
                }
                catch {
                    progress = 0;
                }
                return {
                    id: job.id,
                    status: await job.getState(),
                    progress,
                    data: job.data,
                    result: job.returnvalue,
                    failedReason: job.failedReason,
                    attemptsMade: job.attemptsMade,
                    attempts: job.opts.attempts,
                };
            }
        }
        return null;
    }
    async getQueueMetrics(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue not found: ${queueName}`);
        }
        const counts = await queue.getJobCounts();
        return {
            queueName,
            active: counts.active,
            completed: counts.completed,
            failed: counts.failed,
            delayed: counts.delayed,
            waiting: counts.waiting,
            paused: counts.paused,
            timestamp: new Date(),
        };
    }
    async getAllMetrics() {
        const metrics = [];
        for (const queueName of Object.values(job_types_1.QueueName)) {
            metrics.push(await this.getQueueMetrics(queueName));
        }
        return metrics;
    }
    getQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue not found: ${queueName}`);
        }
        return queue;
    }
    getAllQueues() {
        return this.queues;
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = QueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [queue_config_1.QueueConfig])
], QueueService);
//# sourceMappingURL=queue.service.js.map