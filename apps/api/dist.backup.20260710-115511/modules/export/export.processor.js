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
var ExportProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_2 = require("bullmq");
const exceljs_1 = require("exceljs");
const fs = require("fs/promises");
const path = require("path");
const document_pdf_service_1 = require("../../common/pdf/document-pdf.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const job_failure_service_1 = require("../../common/queues/job-failure.service");
const metrics_service_1 = require("../../common/observability/metrics.service");
let ExportProcessor = ExportProcessor_1 = class ExportProcessor extends bullmq_1.WorkerHost {
    prisma;
    config;
    failures;
    metrics;
    documentPdf;
    logger = new common_1.Logger(ExportProcessor_1.name);
    constructor(prisma, config, failures, metrics, documentPdf) {
        super();
        this.prisma = prisma;
        this.config = config;
        this.failures = failures;
        this.metrics = metrics;
        this.documentPdf = documentPdf;
    }
    onCompleted(job) {
        const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
        this.metrics.bullJobDuration
            .labels('exports', String(job.name), 'completed')
            .observe(Math.max(0, durationSec));
    }
    async onFailed(job, err) {
        const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
        this.metrics.bullJobDuration
            .labels('exports', String(job.name), 'failed')
            .observe(Math.max(0, durationSec));
        await this.failures.record(job, err);
    }
    async process(job) {
        const dir = this.config.get('EXPORT_STORAGE_DIR', './storage/exports');
        await fs.mkdir(dir, { recursive: true });
        if (job.data.type === 'po-pdf') {
            const pdfResult = await this.documentPdf.renderPurchaseOrderPdfById(job.data.purchaseOrderId);
            const outPath = path.join(dir, pdfResult.filename);
            await fs.writeFile(outPath, pdfResult.buffer);
            return { downloadUrl: `/api/v1/export/files/${pdfResult.filename}`, fileName: pdfResult.filename };
        }
        if (job.data.type === 'report-xlsx') {
            const workbook = new exceljs_1.default.Workbook();
            const sheet = workbook.addWorksheet(job.data.reportType);
            sheet.views = [{ state: 'frozen', ySplit: 2 }];
            sheet.addRow(['SoftdigitIMS']);
            sheet.addRow([`Report: ${job.data.reportType}`]);
            sheet.addRow(['Generated', new Date().toISOString()]);
            sheet.addRow([]);
            const header = sheet.addRow(['Column A', 'Column B']);
            header.font = { bold: true };
            header.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEFEFEF' },
            };
            sheet.addRow(['Example', '123']);
            const fileName = `report-${job.data.reportType}-${job.id}.xlsx`;
            const outPath = path.join(dir, fileName);
            await workbook.xlsx.writeFile(outPath);
            return { downloadUrl: `/api/v1/export/files/${fileName}`, fileName };
        }
        this.logger.warn(`Unknown job type: ${JSON.stringify(job.data)}`);
        throw new Error('Unknown export job');
    }
};
exports.ExportProcessor = ExportProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], ExportProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], ExportProcessor.prototype, "onFailed", null);
exports.ExportProcessor = ExportProcessor = ExportProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('exports'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        job_failure_service_1.JobFailureService,
        metrics_service_1.MetricsService,
        document_pdf_service_1.DocumentPdfService])
], ExportProcessor);
//# sourceMappingURL=export.processor.js.map