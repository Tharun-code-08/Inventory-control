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
var JobFailureService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobFailureService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let JobFailureService = JobFailureService_1 = class JobFailureService {
    prisma;
    logger = new common_1.Logger(JobFailureService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(job, error) {
        const queue = job.queueName;
        const totalAttempts = job.opts?.attempts ?? 1;
        const isTerminal = (job.attemptsMade ?? 0) >= totalAttempts;
        if (!isTerminal) {
            return;
        }
        try {
            const existing = await this.prisma.jobFailure.findFirst({
                where: {
                    queue,
                    jobId: job.id ? String(job.id) : null,
                    errorMsg: error?.message?.slice(0, 2000) ?? null,
                    failedAt: { gte: new Date(Date.now() - 60_000) },
                },
                select: { id: true },
            });
            if (existing) {
                return;
            }
            await this.prisma.jobFailure.create({
                data: {
                    queue,
                    jobName: job.name,
                    jobId: job.id ? String(job.id) : null,
                    data: this.toJsonSafe(job.data),
                    errorName: error?.name?.slice(0, 200) ?? null,
                    errorMsg: error?.message?.slice(0, 2000) ?? null,
                    stack: error?.stack?.slice(0, 8000) ?? null,
                    attempts: job.attemptsMade ?? 0,
                },
            });
        }
        catch (writeErr) {
            this.logger.error(`Failed to persist DLQ row for queue=${queue} job=${job.id}: ${writeErr?.message ?? 'unknown'}`);
        }
    }
    toJsonSafe(value) {
        if (value === null || value === undefined)
            return undefined;
        try {
            return JSON.parse(JSON.stringify(value));
        }
        catch {
            return undefined;
        }
    }
};
exports.JobFailureService = JobFailureService;
exports.JobFailureService = JobFailureService = JobFailureService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JobFailureService);
//# sourceMappingURL=job-failure.service.js.map