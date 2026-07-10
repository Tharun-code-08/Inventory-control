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
var BackupProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bullmq_2 = require("bullmq");
const job_failure_service_1 = require("../../common/queues/job-failure.service");
const metrics_service_1 = require("../../common/observability/metrics.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const backup_service_1 = require("./backup.service");
const google_drive_service_1 = require("./google-drive.service");
const tenant_backup_service_1 = require("./tenant-backup.service");
const mail_service_1 = require("../../common/mail/mail.service");
const config_1 = require("@nestjs/config");
const backup_delivery_template_1 = require("../../common/mail/backup-delivery.template");
let BackupProcessor = BackupProcessor_1 = class BackupProcessor extends bullmq_1.WorkerHost {
    prisma;
    tenantBackup;
    backupService;
    googleDrive;
    mail;
    config;
    failures;
    metrics;
    logger = new common_1.Logger(BackupProcessor_1.name);
    constructor(prisma, tenantBackup, backupService, googleDrive, mail, config, failures, metrics) {
        super();
        this.prisma = prisma;
        this.tenantBackup = tenantBackup;
        this.backupService = backupService;
        this.googleDrive = googleDrive;
        this.mail = mail;
        this.config = config;
        this.failures = failures;
        this.metrics = metrics;
    }
    onCompleted(job) {
        const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
        this.metrics.bullJobDuration.labels('backups', String(job.name), 'completed').observe(Math.max(0, durationSec));
    }
    async onFailed(job, err) {
        const durationSec = (Date.now() - (job.processedOn ?? Date.now())) / 1000;
        this.metrics.bullJobDuration.labels('backups', String(job.name), 'failed').observe(Math.max(0, durationSec));
        await this.failures.record(job, err);
    }
    async process(job) {
        const backupJob = await this.prisma.backupJob.findUnique({ where: { id: job.data.backupJobId } });
        if (!backupJob)
            throw new Error('Backup job not found');
        await this.prisma.backupJob.update({
            where: { id: backupJob.id },
            data: { status: client_1.BackupJobStatus.RUNNING, startedAt: new Date() },
        });
        try {
            const payload = await this.tenantBackup.exportCompany(backupJob.companyId);
            const buffer = this.tenantBackup.serializeBackup(payload);
            const fileName = `tenant-${backupJob.companyId.slice(0, 8)}-${Date.now()}.json.gz`;
            let driveFileId;
            if (backupJob.provider === client_1.BackupProvider.GOOGLE_DRIVE) {
                const accessToken = await this.backupService.getAccessTokenForCompany(backupJob.companyId);
                const credential = await this.prisma.backupProviderCredential.findUnique({
                    where: {
                        companyId_provider: { companyId: backupJob.companyId, provider: client_1.BackupProvider.GOOGLE_DRIVE },
                    },
                });
                if (accessToken && credential?.driveFolderId) {
                    const uploaded = await this.googleDrive.uploadFile({
                        accessToken,
                        folderId: credential.driveFolderId,
                        fileName,
                        mimeType: 'application/gzip',
                        buffer,
                    });
                    driveFileId = uploaded.id;
                }
            }
            await this.backupService.persistBackupArtifact({
                companyId: backupJob.companyId,
                backupJobId: backupJob.id,
                provider: backupJob.provider,
                buffer,
                fileName,
                driveFileId,
            });
            if (backupJob.provider === client_1.BackupProvider.EMAIL) {
                if (!this.mail.isConfigured()) {
                    throw new Error('Email delivery is not configured (missing SMTP env)');
                }
                const recipient = (backupJob.createdById
                    ? (await this.prisma.user.findUnique({
                        where: { id: backupJob.createdById },
                        select: { email: true },
                    }))?.email
                    : null) || this.config.get('ADMIN_NOTIFICATION_EMAIL');
                if (!recipient) {
                    throw new Error('No email recipient for backup delivery (user email and ADMIN_NOTIFICATION_EMAIL missing)');
                }
                const company = await this.prisma.company.findUnique({
                    where: { id: backupJob.companyId },
                    select: { companyCode: true },
                });
                const maxBytes = 20 * 1024 * 1024;
                if (buffer.length > maxBytes) {
                    throw new Error('Backup file too large to email (limit 20MB)');
                }
                const approxSizeKb = Math.max(1, Math.round(buffer.length / 1024));
                await this.mail.sendMail({
                    to: recipient,
                    subject: (0, backup_delivery_template_1.backupDeliverySubject)({
                        companyCode: company?.companyCode ?? null,
                        fileName,
                        approxSizeKb,
                    }),
                    text: (0, backup_delivery_template_1.backupDeliveryText)({
                        companyCode: company?.companyCode ?? null,
                        fileName,
                        approxSizeKb,
                    }),
                    html: (0, backup_delivery_template_1.backupDeliveryHtml)({
                        companyCode: company?.companyCode ?? null,
                        fileName,
                        approxSizeKb,
                    }),
                    fromName: 'SoftdigitIMS Backups',
                    attachments: [{ filename: fileName, content: buffer, contentType: 'application/gzip' }],
                });
            }
            await this.prisma.backupJob.update({
                where: { id: backupJob.id },
                data: { status: client_1.BackupJobStatus.COMPLETED, completedAt: new Date() },
            });
            return { ok: true, fileName, driveFileId: driveFileId ?? null };
        }
        catch (err) {
            await this.prisma.backupJob.update({
                where: { id: backupJob.id },
                data: {
                    status: client_1.BackupJobStatus.FAILED,
                    completedAt: new Date(),
                    errorMessage: err instanceof Error ? err.message : 'Backup failed',
                },
            });
            throw err;
        }
    }
};
exports.BackupProcessor = BackupProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], BackupProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], BackupProcessor.prototype, "onFailed", null);
exports.BackupProcessor = BackupProcessor = BackupProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('backups'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenant_backup_service_1.TenantBackupService,
        backup_service_1.BackupService,
        google_drive_service_1.GoogleDriveService,
        mail_service_1.MailService,
        config_1.ConfigService,
        job_failure_service_1.JobFailureService,
        metrics_service_1.MetricsService])
], BackupProcessor);
//# sourceMappingURL=backup.processor.js.map