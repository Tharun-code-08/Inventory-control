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
var BackupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const bullmq_2 = require("bullmq");
const fs = require("fs/promises");
const path = require("path");
const crypto_1 = require("crypto");
const secret_crypto_1 = require("../../common/utils/secret-crypto");
const subscription_service_1 = require("../billing/subscription.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const backup_constants_1 = require("./backup.constants");
const google_drive_service_1 = require("./google-drive.service");
const tenant_backup_service_1 = require("./tenant-backup.service");
const mail_service_1 = require("../../common/mail/mail.service");
let BackupService = BackupService_1 = class BackupService {
    prisma;
    subscriptions;
    tenantBackup;
    googleDrive;
    mail;
    jwt;
    config;
    audit;
    backupQueue;
    logger = new common_1.Logger(BackupService_1.name);
    constructor(prisma, subscriptions, tenantBackup, googleDrive, mail, jwt, config, audit, backupQueue) {
        this.prisma = prisma;
        this.subscriptions = subscriptions;
        this.tenantBackup = tenantBackup;
        this.googleDrive = googleDrive;
        this.mail = mail;
        this.jwt = jwt;
        this.config = config;
        this.audit = audit;
        this.backupQueue = backupQueue;
    }
    backupDir() {
        return this.config.get('BACKUP_STORAGE_DIR', './storage/backups');
    }
    featureEnabled() {
        const raw = this.config.get('BACKUP_FEATURE_ENABLED', 'true');
        return raw !== 'false' && raw !== '0';
    }
    async assertBackupAccess(user) {
        if (!this.featureEnabled()) {
            throw new common_1.ForbiddenException('Backup feature is disabled');
        }
        if (user.role !== client_1.RoleName.OWNER && user.role !== client_1.RoleName.ADMIN) {
            throw new common_1.ForbiddenException('Only organisation admins can manage backups');
        }
        const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
        if (!companyId)
            throw new common_1.ForbiddenException('Organisation context is required');
        await this.subscriptions.assertFeature(companyId, 'backups');
        return companyId;
    }
    async getStatus(user) {
        const companyId = await this.assertBackupAccess(user);
        const credential = await this.prisma.backupProviderCredential.findUnique({
            where: { companyId_provider: { companyId, provider: client_1.BackupProvider.GOOGLE_DRIVE } },
        });
        const [latestArtifact, aggregates] = await Promise.all([
            this.prisma.backupArtifact.findFirst({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.backupArtifact.aggregate({
                where: { companyId },
                _count: { id: true },
                _sum: { fileSize: true },
            }),
        ]);
        const missingKeys = this.googleDrive.missingConfigKeys();
        const totalStorageBytes = aggregates._sum.fileSize ?? BigInt(0);
        return {
            googleDriveConfigured: this.googleDrive.isConfigured(),
            googleDriveConnected: Boolean(credential),
            googleDriveEmail: credential?.accountEmail ?? null,
            latestBackupAt: latestArtifact?.createdAt?.toISOString() ?? null,
            totalBackups: aggregates._count.id ?? 0,
            totalStorageBytes: totalStorageBytes.toString(),
            emailDeliveryConfigured: this.mail.isConfigured(),
            googleDriveConfigMissing: missingKeys,
            schemaVersion: backup_constants_1.BACKUP_SCHEMA_VERSION,
        };
    }
    buildGoogleConnectUrl(user) {
        if (!this.googleDrive.isConfigured()) {
            throw new common_1.BadRequestException('Google Drive OAuth is not configured on the server');
        }
        const state = this.jwt.sign({ sub: user.id, purpose: 'backup-google-connect' }, { expiresIn: '15m' });
        return { url: this.googleDrive.buildAuthUrl(state) };
    }
    async completeGoogleConnect(code, state) {
        const payload = this.jwt.verify(state);
        if (payload.purpose !== 'backup-google-connect') {
            throw new common_1.BadRequestException('Invalid OAuth state');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { role: true, shop: { select: { companyId: true } } },
        });
        if (!user?.shop?.companyId)
            throw new common_1.ForbiddenException('Organisation context is required');
        if (user.role.name !== client_1.RoleName.OWNER && user.role.name !== client_1.RoleName.ADMIN) {
            throw new common_1.ForbiddenException('Only organisation admins can connect Google Drive');
        }
        await this.subscriptions.assertFeature(user.shop.companyId, 'backups');
        const tokens = await this.googleDrive.exchangeCode(code);
        if (!tokens.refresh_token) {
            throw new common_1.BadRequestException('Google did not return a refresh token. Reconnect with consent.');
        }
        const profile = await this.googleDrive.getProfile(tokens.access_token);
        const folderId = await this.googleDrive.ensureFolder(tokens.access_token, `SoftdigitIMS Backups - ${user.shop.companyId.slice(0, 8)}`);
        await this.prisma.backupProviderCredential.upsert({
            where: {
                companyId_provider: { companyId: user.shop.companyId, provider: client_1.BackupProvider.GOOGLE_DRIVE },
            },
            create: {
                companyId: user.shop.companyId,
                provider: client_1.BackupProvider.GOOGLE_DRIVE,
                encryptedTokens: this.googleDrive.encryptTokens(tokens),
                accountEmail: profile.email ?? null,
                driveFolderId: folderId,
            },
            update: {
                encryptedTokens: this.googleDrive.encryptTokens(tokens),
                accountEmail: profile.email ?? null,
                driveFolderId: folderId,
            },
        });
        return { ok: true, email: profile.email ?? null };
    }
    async disconnectGoogle(user) {
        const companyId = await this.assertBackupAccess(user);
        await this.prisma.backupProviderCredential.deleteMany({
            where: { companyId, provider: client_1.BackupProvider.GOOGLE_DRIVE },
        });
        return { ok: true };
    }
    async listArtifacts(user) {
        const companyId = await this.assertBackupAccess(user);
        const rows = await this.prisma.backupArtifact.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return rows.map((row) => ({
            id: row.id,
            fileName: row.fileName,
            fileSize: row.fileSize.toString(),
            sha256: row.sha256,
            provider: row.provider,
            schemaVersion: row.schemaVersion,
            createdAt: row.createdAt.toISOString(),
        }));
    }
    async createBackupJob(user, provider = client_1.BackupProvider.MANUAL) {
        const companyId = await this.assertBackupAccess(user);
        if (provider === client_1.BackupProvider.GOOGLE_DRIVE) {
            if (!this.googleDrive.isConfigured()) {
                const missing = this.googleDrive.missingConfigKeys();
                throw new common_1.BadRequestException(`Google Drive is not configured on the server${missing.length ? ` (missing ${missing.join(', ')})` : ''}`);
            }
            const credential = await this.prisma.backupProviderCredential.findUnique({
                where: { companyId_provider: { companyId, provider: client_1.BackupProvider.GOOGLE_DRIVE } },
            });
            if (!credential) {
                throw new common_1.BadRequestException('Connect Google Drive before creating Drive backups');
            }
        }
        else if (provider === client_1.BackupProvider.EMAIL) {
            if (!this.mail.isConfigured()) {
                throw new common_1.BadRequestException('Email delivery is not configured (set SMTP env vars)');
            }
            if (!user.email?.trim()) {
                throw new common_1.BadRequestException('User email is required to send backups by email');
            }
        }
        const job = await this.prisma.backupJob.create({
            data: {
                companyId,
                provider,
                status: client_1.BackupJobStatus.PENDING,
                createdById: user.id,
            },
        });
        await this.backupQueue.add('tenant-backup', { backupJobId: job.id }, { jobId: job.id });
        return { jobId: job.id };
    }
    async saveUploadedArtifact(user, file) {
        const companyId = await this.assertBackupAccess(user);
        if (!file?.buffer?.length)
            throw new common_1.BadRequestException('Backup file is required');
        const payload = this.tenantBackup.parseBackupBuffer(file.buffer);
        const dir = this.backupDir();
        await fs.mkdir(dir, { recursive: true });
        const fileName = `manual-${companyId.slice(0, 8)}-${Date.now()}.json.gz`;
        const storagePath = path.join(dir, fileName);
        const buffer = this.tenantBackup.serializeBackup(payload);
        await fs.writeFile(storagePath, buffer);
        const artifact = await this.prisma.backupArtifact.create({
            data: {
                companyId,
                fileName,
                storagePath,
                fileSize: BigInt(buffer.length),
                sha256: (0, secret_crypto_1.sha256Hex)(buffer),
                provider: client_1.BackupProvider.MANUAL,
                schemaVersion: payload.backupSchemaVersion,
            },
        });
        return { artifactId: artifact.id, fileName: artifact.fileName };
    }
    async getArtifactDownloadPath(user, artifactId) {
        const companyId = await this.assertBackupAccess(user);
        const artifact = await this.prisma.backupArtifact.findFirst({
            where: { id: artifactId, companyId },
        });
        if (!artifact)
            throw new common_1.NotFoundException('Backup artifact not found');
        return artifact;
    }
    async dryRunRestore(user, artifactId) {
        const companyId = await this.assertBackupAccess(user);
        const artifact = await this.prisma.backupArtifact.findFirst({
            where: { id: artifactId, companyId },
        });
        if (!artifact)
            throw new common_1.NotFoundException('Backup artifact not found');
        const buffer = await fs.readFile(artifact.storagePath);
        const payload = this.tenantBackup.parseBackupBuffer(buffer);
        const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
        const report = this.tenantBackup.buildDryRunReport(payload, company);
        const confirmationToken = (0, crypto_1.randomBytes)(24).toString('hex');
        const restoreJob = await this.prisma.restoreJob.create({
            data: {
                companyId,
                artifactId,
                mode: client_1.RestoreMode.TENANT_REPLACE,
                status: client_1.RestoreJobStatus.DRY_RUN_COMPLETED,
                dryRunReport: report,
                confirmationToken,
                createdById: user.id,
            },
        });
        return { restoreJobId: restoreJob.id, report, confirmationToken };
    }
    async applyRestore(user, restoreJobId, confirmationToken) {
        const companyId = await this.assertBackupAccess(user);
        const restoreJob = await this.prisma.restoreJob.findFirst({
            where: { id: restoreJobId, companyId },
            include: { artifact: true },
        });
        if (!restoreJob)
            throw new common_1.NotFoundException('Restore job not found');
        if (restoreJob.status !== client_1.RestoreJobStatus.DRY_RUN_COMPLETED) {
            throw new common_1.BadRequestException('Restore must be dry-run first');
        }
        if (restoreJob.confirmationToken !== confirmationToken) {
            throw new common_1.BadRequestException('Invalid restore confirmation token');
        }
        await this.prisma.restoreJob.update({
            where: { id: restoreJob.id },
            data: { status: client_1.RestoreJobStatus.RUNNING, startedAt: new Date() },
        });
        const startedAt = Date.now();
        try {
            const buffer = await fs.readFile(restoreJob.artifact.storagePath);
            const payload = this.tenantBackup.parseBackupBuffer(buffer);
            const result = await this.tenantBackup.applyTenantReplace(companyId, payload, user.id);
            await this.prisma.restoreJob.update({
                where: { id: restoreJob.id },
                data: {
                    status: client_1.RestoreJobStatus.COMPLETED,
                    completedAt: new Date(),
                    dryRunReport: {
                        ...restoreJob.dryRunReport,
                        appliedRecordsProcessed: result.recordsProcessed,
                    },
                },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.UPDATE,
                entityType: 'COMPANY_BACKUP_RESTORE',
                entityId: restoreJob.id,
                newValues: { artifactId: restoreJob.artifactId, recordsProcessed: result.recordsProcessed },
            });
            this.logger.log(`Tenant restore completed company=${companyId} records=${result.recordsProcessed} durationMs=${Date.now() - startedAt}`);
            return { ok: true, recordsProcessed: result.recordsProcessed };
        }
        catch (err) {
            this.logger.error(`Tenant restore failed company=${companyId} durationMs=${Date.now() - startedAt}: ${err instanceof Error ? err.message : err}`);
            await this.prisma.restoreJob.update({
                where: { id: restoreJob.id },
                data: {
                    status: client_1.RestoreJobStatus.FAILED,
                    completedAt: new Date(),
                    errorMessage: err instanceof Error ? err.message : 'Restore failed',
                },
            });
            throw err;
        }
    }
    async getAccessTokenForCompany(companyId) {
        const credential = await this.prisma.backupProviderCredential.findUnique({
            where: { companyId_provider: { companyId, provider: client_1.BackupProvider.GOOGLE_DRIVE } },
        });
        if (!credential)
            return null;
        let tokens = this.googleDrive.decryptTokens(credential.encryptedTokens);
        if (!tokens.refresh_token)
            return tokens.access_token;
        if (!tokens.expiry_date || tokens.expiry_date < Date.now() + 60_000) {
            tokens = await this.googleDrive.refreshAccessToken(tokens.refresh_token);
            await this.prisma.backupProviderCredential.update({
                where: { id: credential.id },
                data: { encryptedTokens: this.googleDrive.encryptTokens(tokens) },
            });
        }
        return tokens.access_token;
    }
    async persistBackupArtifact(args) {
        const dir = this.backupDir();
        await fs.mkdir(dir, { recursive: true });
        const storagePath = path.join(dir, args.fileName);
        await fs.writeFile(storagePath, args.buffer);
        return this.prisma.backupArtifact.create({
            data: {
                companyId: args.companyId,
                backupJobId: args.backupJobId,
                fileName: args.fileName,
                storagePath,
                fileSize: BigInt(args.buffer.length),
                sha256: (0, secret_crypto_1.sha256Hex)(args.buffer),
                provider: args.provider,
                driveFileId: args.driveFileId ?? null,
                schemaVersion: backup_constants_1.BACKUP_SCHEMA_VERSION,
            },
        });
    }
    async getBackupJob(user, jobId) {
        const companyId = await this.assertBackupAccess(user);
        const job = await this.prisma.backupJob.findFirst({
            where: { id: jobId, companyId },
            select: {
                id: true,
                status: true,
                provider: true,
                errorMessage: true,
                completedAt: true,
                createdAt: true,
            },
        });
        if (!job)
            throw new common_1.NotFoundException('Backup job not found');
        return job;
    }
    googleRedirectSuccessUrl() {
        const web = this.config.get('PUBLIC_WEB_URL') ?? this.config.get('WEB_ORIGIN') ?? '';
        const base = web.split(',')[0]?.trim() || 'http://localhost:5173';
        return `${base.replace(/\/$/, '')}/settings?tab=backups&drive=connected`;
    }
    googleRedirectErrorUrl() {
        const web = this.config.get('PUBLIC_WEB_URL') ?? this.config.get('WEB_ORIGIN') ?? '';
        const base = web.split(',')[0]?.trim() || 'http://localhost:5173';
        return `${base.replace(/\/$/, '')}/settings?tab=backups&drive=error`;
    }
};
exports.BackupService = BackupService;
exports.BackupService = BackupService = BackupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(8, (0, bullmq_1.InjectQueue)(backup_constants_1.BACKUP_QUEUE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        subscription_service_1.SubscriptionService,
        tenant_backup_service_1.TenantBackupService,
        google_drive_service_1.GoogleDriveService,
        mail_service_1.MailService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_service_1.AuditService,
        bullmq_2.Queue])
], BackupService);
//# sourceMappingURL=backup.service.js.map