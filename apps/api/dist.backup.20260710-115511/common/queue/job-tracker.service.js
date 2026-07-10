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
var JobTrackerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobTrackerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const job_types_1 = require("./job-types");
let JobTrackerService = JobTrackerService_1 = class JobTrackerService {
    prisma;
    logger = new common_1.Logger(JobTrackerService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createJobRecord(tenantId, jobId, documentType, referenceId) {
        const record = await this.prisma.documentRegistry.create({
            data: {
                tenantId,
                documentType,
                referenceId: referenceId || null,
                templateVersion: '1.0',
                storageKey: '',
                storageProvider: process.env.STORAGE_TYPE || 'local',
                status: job_types_1.JobStatus.QUEUED,
                jobId,
                mimeType: 'application/pdf',
            },
        });
        this.logger.log(`Job record created: ${record.id} (jobId: ${jobId})`);
        return record.id;
    }
    async updateJobStatus(jobId, status, _progress) {
        await this.prisma.documentRegistry.updateMany({
            where: { jobId },
            data: {
                status,
                updatedAt: new Date(),
            },
        });
    }
    async completeJob(jobId, storageKey, fileSize, checksum) {
        await this.prisma.documentRegistry.updateMany({
            where: { jobId },
            data: {
                status: job_types_1.JobStatus.COMPLETED,
                storageKey,
                fileSizeBytes: fileSize,
                checksum,
                generatedAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }
    async failJob(jobId, error) {
        await this.prisma.documentRegistry.updateMany({
            where: { jobId },
            data: {
                status: job_types_1.JobStatus.FAILED,
                updatedAt: new Date(),
            },
        });
        this.logger.error(`Job failed: ${jobId} - ${error}`);
    }
    async getJobRecord(jobId) {
        return this.prisma.documentRegistry.findFirst({
            where: { jobId },
        });
    }
    async checkCachedDocument(tenantId, documentType, referenceId, templateVersion) {
        return this.prisma.documentRegistry.findFirst({
            where: {
                tenantId,
                documentType,
                referenceId: referenceId || undefined,
                templateVersion,
                status: job_types_1.JobStatus.COMPLETED,
                expiresAt: {
                    gt: new Date(),
                },
            },
            orderBy: {
                generatedAt: 'desc',
            },
        });
    }
};
exports.JobTrackerService = JobTrackerService;
exports.JobTrackerService = JobTrackerService = JobTrackerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JobTrackerService);
//# sourceMappingURL=job-tracker.service.js.map