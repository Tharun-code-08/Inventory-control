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
var PdfWorkerProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfWorkerProcessor = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const job_tracker_service_1 = require("../queue/job-tracker.service");
const job_types_1 = require("../queue/job-types");
const pdf_renderer_service_1 = require("./pdf-renderer.service");
const crypto = require("crypto");
let PdfWorkerProcessor = PdfWorkerProcessor_1 = class PdfWorkerProcessor {
    prisma;
    storage;
    jobTracker;
    pdfRenderer;
    logger = new common_1.Logger(PdfWorkerProcessor_1.name);
    constructor(prisma, storage, jobTracker, pdfRenderer) {
        this.prisma = prisma;
        this.storage = storage;
        this.jobTracker = jobTracker;
        this.pdfRenderer = pdfRenderer;
    }
    async processPdfJob(job) {
        const jobId = job.id;
        const { tenantId, documentType, referenceId, metadata, forceRegenerate } = job.data;
        this.logger.log(`Processing job ${jobId}: ${documentType} (ref: ${referenceId || 'none'})`);
        try {
            const cachedPdf = await this.checkCache(tenantId, documentType, referenceId, metadata);
            if (cachedPdf && !forceRegenerate) {
                this.logger.log(`Cache hit: ${jobId}`);
                return this.createJobResult(cachedPdf);
            }
            await this.jobTracker.updateJobStatus(jobId, job_types_1.JobStatus.PROCESSING);
            const renderStartTime = Date.now();
            const pdfBuffer = await this.renderPdf(tenantId, documentType, referenceId, metadata);
            const renderDurationMs = Date.now() - renderStartTime;
            const uploadStartTime = Date.now();
            await this.jobTracker.updateJobStatus(jobId, job_types_1.JobStatus.UPLOADING);
            const storageKey = this.generateStorageKey(tenantId, documentType, referenceId);
            const checksum = this.computeChecksum(pdfBuffer);
            await this.storage.writeBuffer(storageKey, pdfBuffer, {
                contentType: 'application/pdf',
            });
            const storageLatencyMs = Date.now() - uploadStartTime;
            await this.updateRegistry(jobId, tenantId, documentType, referenceId, storageKey, pdfBuffer.length, checksum, renderDurationMs, storageLatencyMs);
            const signedUrl = await this.storage.getSignedUrl(storageKey, 3600);
            this.logger.log(`Job completed: ${jobId} (${renderDurationMs}ms render, ${storageLatencyMs}ms upload)`);
            return {
                documentId: ((await this.prisma.documentRegistry.findFirst({
                    where: { jobId },
                })) ?? { id: '' }).id,
                storageKey,
                mimeType: 'application/pdf',
                fileSize: pdfBuffer.length,
                checksum,
                signedUrl,
                expiresAt: new Date(Date.now() + 3600000),
            };
        }
        catch (error) {
            this.logger.error(`Job failed: ${jobId} - ${error.message}`);
            await this.jobTracker.failJob(jobId, error.message);
            throw error;
        }
    }
    async checkCache(tenantId, documentType, referenceId, _metadata) {
        const cached = await this.jobTracker.checkCachedDocument(tenantId, documentType, referenceId || null, '1.0');
        if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
            return cached;
        }
        return null;
    }
    async renderPdf(tenantId, documentType, referenceId, _metadata) {
        const documentData = await this.fetchDocumentData(documentType, referenceId);
        const branding = await this.fetchBranding(tenantId);
        const context = {
            documentType,
            data: documentData,
            branding,
        };
        return this.pdfRenderer.renderPdf(context);
    }
    async fetchDocumentData(_documentType, _referenceId) {
        return {};
    }
    async fetchBranding(_tenantId) {
        return {
            logoUrl: null,
            companyName: null,
        };
    }
    generateStorageKey(tenantId, documentType, referenceId) {
        const templateVersion = '1.0';
        const timestamp = new Date().toISOString().split('T')[0];
        if (referenceId) {
            return `tenant-${tenantId}/documents/${documentType}/${referenceId}/${templateVersion}/document.pdf`;
        }
        return `tenant-${tenantId}/documents/${documentType}/${timestamp}/${templateVersion}/document.pdf`;
    }
    computeChecksum(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
    async updateRegistry(jobId, tenantId, documentType, referenceId, storageKey, fileSize, checksum, renderDurationMs, storageLatencyMs) {
        await this.prisma.documentRegistry.updateMany({
            where: { jobId },
            data: {
                status: job_types_1.JobStatus.COMPLETED,
                storageKey,
                fileSizeBytes: fileSize,
                checksum,
                renderDurationMs,
                renderedAt: new Date(),
                storageLatencyMs,
                updatedAt: new Date(),
            },
        });
    }
    createJobResult(registryRecord) {
        return {
            documentId: registryRecord.id,
            storageKey: registryRecord.storageKey,
            mimeType: registryRecord.mimeType,
            fileSize: Number(registryRecord.fileSizeBytes),
            checksum: registryRecord.checksum,
            signedUrl: '',
            expiresAt: registryRecord.expiresAt || new Date(Date.now() + 3600000),
        };
    }
};
exports.PdfWorkerProcessor = PdfWorkerProcessor;
exports.PdfWorkerProcessor = PdfWorkerProcessor = PdfWorkerProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        job_tracker_service_1.JobTrackerService,
        pdf_renderer_service_1.PdfRendererService])
], PdfWorkerProcessor);
//# sourceMappingURL=pdf-worker.processor.js.map