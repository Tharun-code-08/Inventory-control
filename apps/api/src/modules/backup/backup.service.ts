import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuditAction,
  BackupJobStatus,
  BackupProvider,
  RestoreJobStatus,
  RestoreMode,
  RoleName,
} from '@prisma/client';
import { Queue } from 'bullmq';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';
import type { RequestUser } from '../../common/types/request-user';
import { sha256Hex } from '../../common/utils/secret-crypto';
import { SubscriptionService } from '../billing/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BACKUP_QUEUE, BACKUP_SCHEMA_VERSION } from './backup.constants';
import { GoogleDriveService } from './google-drive.service';
import { TenantBackupService } from './tenant-backup.service';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
    private readonly tenantBackup: TenantBackupService,
    private readonly googleDrive: GoogleDriveService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    @InjectQueue(BACKUP_QUEUE) private readonly backupQueue: Queue,
  ) {}

  private backupDir() {
    return this.config.get<string>('BACKUP_STORAGE_DIR', './storage/backups');
  }

  private featureEnabled() {
    const raw = this.config.get<string>('BACKUP_FEATURE_ENABLED', 'true');
    return raw !== 'false' && raw !== '0';
  }

  async assertBackupAccess(user: RequestUser) {
    if (!this.featureEnabled()) {
      throw new ForbiddenException('Backup feature is disabled');
    }
    if (user.role !== RoleName.OWNER && user.role !== RoleName.ADMIN) {
      throw new ForbiddenException('Only organisation admins can manage backups');
    }
    const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
    if (!companyId) throw new ForbiddenException('Organisation context is required');
    await this.subscriptions.assertFeature(companyId, 'backups');
    return companyId;
  }

  async getStatus(user: RequestUser) {
    const companyId = await this.assertBackupAccess(user);
    const credential = await this.prisma.backupProviderCredential.findUnique({
      where: { companyId_provider: { companyId, provider: BackupProvider.GOOGLE_DRIVE } },
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
      schemaVersion: BACKUP_SCHEMA_VERSION,
    };
  }

  buildGoogleConnectUrl(user: RequestUser) {
    if (!this.googleDrive.isConfigured()) {
      throw new BadRequestException('Google Drive OAuth is not configured on the server');
    }
    const state = this.jwt.sign(
      { sub: user.id, purpose: 'backup-google-connect' },
      { expiresIn: '15m' },
    );
    return { url: this.googleDrive.buildAuthUrl(state) };
  }

  async completeGoogleConnect(code: string, state: string) {
    const payload = this.jwt.verify<{ sub: string; purpose?: string }>(state);
    if (payload.purpose !== 'backup-google-connect') {
      throw new BadRequestException('Invalid OAuth state');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, shop: { select: { companyId: true } } },
    });
    if (!user?.shop?.companyId) throw new ForbiddenException('Organisation context is required');
    if (user.role.name !== RoleName.OWNER && user.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException('Only organisation admins can connect Google Drive');
    }
    await this.subscriptions.assertFeature(user.shop.companyId, 'backups');

    const tokens = await this.googleDrive.exchangeCode(code);
    if (!tokens.refresh_token) {
      throw new BadRequestException('Google did not return a refresh token. Reconnect with consent.');
    }
    const profile = await this.googleDrive.getProfile(tokens.access_token);
    const folderId = await this.googleDrive.ensureFolder(
      tokens.access_token,
      `SoftdigitIMS Backups - ${user.shop.companyId.slice(0, 8)}`,
    );

    await this.prisma.backupProviderCredential.upsert({
      where: {
        companyId_provider: { companyId: user.shop.companyId, provider: BackupProvider.GOOGLE_DRIVE },
      },
      create: {
        companyId: user.shop.companyId,
        provider: BackupProvider.GOOGLE_DRIVE,
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

  async disconnectGoogle(user: RequestUser) {
    const companyId = await this.assertBackupAccess(user);
    await this.prisma.backupProviderCredential.deleteMany({
      where: { companyId, provider: BackupProvider.GOOGLE_DRIVE },
    });
    return { ok: true };
  }

  async listArtifacts(user: RequestUser) {
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

  async createBackupJob(user: RequestUser, provider: BackupProvider = BackupProvider.MANUAL) {
    const companyId = await this.assertBackupAccess(user);
    if (provider === BackupProvider.GOOGLE_DRIVE) {
      if (!this.googleDrive.isConfigured()) {
        const missing = this.googleDrive.missingConfigKeys();
        throw new BadRequestException(
          `Google Drive is not configured on the server${missing.length ? ` (missing ${missing.join(', ')})` : ''}`,
        );
      }
      const credential = await this.prisma.backupProviderCredential.findUnique({
        where: { companyId_provider: { companyId, provider: BackupProvider.GOOGLE_DRIVE } },
      });
      if (!credential) {
        throw new BadRequestException('Connect Google Drive before creating Drive backups');
      }
    } else if (provider === BackupProvider.EMAIL) {
      if (!this.mail.isConfigured()) {
        throw new BadRequestException('Email delivery is not configured (set SMTP env vars)');
      }
      if (!user.email?.trim()) {
        throw new BadRequestException('User email is required to send backups by email');
      }
    }
    const job = await this.prisma.backupJob.create({
      data: {
        companyId,
        provider,
        status: BackupJobStatus.PENDING,
        createdById: user.id,
      },
    });
    await this.backupQueue.add('tenant-backup', { backupJobId: job.id }, { jobId: job.id });
    return { jobId: job.id };
  }

  async saveUploadedArtifact(user: RequestUser, file: Express.Multer.File) {
    const companyId = await this.assertBackupAccess(user);
    if (!file?.buffer?.length) throw new BadRequestException('Backup file is required');
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
        sha256: sha256Hex(buffer),
        provider: BackupProvider.MANUAL,
        schemaVersion: payload.backupSchemaVersion,
      },
    });
    return { artifactId: artifact.id, fileName: artifact.fileName };
  }

  async getArtifactDownloadPath(user: RequestUser, artifactId: string) {
    const companyId = await this.assertBackupAccess(user);
    const artifact = await this.prisma.backupArtifact.findFirst({
      where: { id: artifactId, companyId },
    });
    if (!artifact) throw new NotFoundException('Backup artifact not found');
    return artifact;
  }

  async dryRunRestore(user: RequestUser, artifactId: string) {
    const companyId = await this.assertBackupAccess(user);
    const artifact = await this.prisma.backupArtifact.findFirst({
      where: { id: artifactId, companyId },
    });
    if (!artifact) throw new NotFoundException('Backup artifact not found');
    const buffer = await fs.readFile(artifact.storagePath);
    const payload = this.tenantBackup.parseBackupBuffer(buffer);
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const report = this.tenantBackup.buildDryRunReport(payload, company);
    const confirmationToken = randomBytes(24).toString('hex');
    const restoreJob = await this.prisma.restoreJob.create({
      data: {
        companyId,
        artifactId,
        mode: RestoreMode.TENANT_REPLACE,
        status: RestoreJobStatus.DRY_RUN_COMPLETED,
        dryRunReport: report,
        confirmationToken,
        createdById: user.id,
      },
    });
    return { restoreJobId: restoreJob.id, report, confirmationToken };
  }

  async applyRestore(user: RequestUser, restoreJobId: string, confirmationToken: string) {
    const companyId = await this.assertBackupAccess(user);
    const restoreJob = await this.prisma.restoreJob.findFirst({
      where: { id: restoreJobId, companyId },
      include: { artifact: true },
    });
    if (!restoreJob) throw new NotFoundException('Restore job not found');
    if (restoreJob.status !== RestoreJobStatus.DRY_RUN_COMPLETED) {
      throw new BadRequestException('Restore must be dry-run first');
    }
    if (restoreJob.confirmationToken !== confirmationToken) {
      throw new BadRequestException('Invalid restore confirmation token');
    }

    await this.prisma.restoreJob.update({
      where: { id: restoreJob.id },
      data: { status: RestoreJobStatus.RUNNING, startedAt: new Date() },
    });

    const startedAt = Date.now();
    try {
      const buffer = await fs.readFile(restoreJob.artifact.storagePath);
      const payload = this.tenantBackup.parseBackupBuffer(buffer);
      const result = await this.tenantBackup.applyTenantReplace(companyId, payload, user.id);
      await this.prisma.restoreJob.update({
        where: { id: restoreJob.id },
        data: {
          status: RestoreJobStatus.COMPLETED,
          completedAt: new Date(),
          dryRunReport: {
            ...(restoreJob.dryRunReport as object),
            appliedRecordsProcessed: result.recordsProcessed,
          },
        },
      });
      await this.audit.log({
        userId: user.id,
        action: AuditAction.UPDATE,
        entityType: 'COMPANY_BACKUP_RESTORE',
        entityId: restoreJob.id,
        newValues: { artifactId: restoreJob.artifactId, recordsProcessed: result.recordsProcessed },
      });
      this.logger.log(
        `Tenant restore completed company=${companyId} records=${result.recordsProcessed} durationMs=${Date.now() - startedAt}`,
      );
      return { ok: true, recordsProcessed: result.recordsProcessed };
    } catch (err) {
      this.logger.error(
        `Tenant restore failed company=${companyId} durationMs=${Date.now() - startedAt}: ${err instanceof Error ? err.message : err}`,
      );
      await this.prisma.restoreJob.update({
        where: { id: restoreJob.id },
        data: {
          status: RestoreJobStatus.FAILED,
          completedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : 'Restore failed',
        },
      });
      throw err;
    }
  }

  async getAccessTokenForCompany(companyId: string) {
    const credential = await this.prisma.backupProviderCredential.findUnique({
      where: { companyId_provider: { companyId, provider: BackupProvider.GOOGLE_DRIVE } },
    });
    if (!credential) return null;
    let tokens = this.googleDrive.decryptTokens(credential.encryptedTokens);
    if (!tokens.refresh_token) return tokens.access_token;
    if (!tokens.expiry_date || tokens.expiry_date < Date.now() + 60_000) {
      tokens = await this.googleDrive.refreshAccessToken(tokens.refresh_token);
      await this.prisma.backupProviderCredential.update({
        where: { id: credential.id },
        data: { encryptedTokens: this.googleDrive.encryptTokens(tokens) },
      });
    }
    return tokens.access_token;
  }

  async persistBackupArtifact(args: {
    companyId: string;
    backupJobId: string;
    provider: BackupProvider;
    buffer: Buffer;
    fileName: string;
    driveFileId?: string;
  }) {
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
        sha256: sha256Hex(args.buffer),
        provider: args.provider,
        driveFileId: args.driveFileId ?? null,
        schemaVersion: BACKUP_SCHEMA_VERSION,
      },
    });
  }

  async getBackupJob(user: RequestUser, jobId: string) {
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
    if (!job) throw new NotFoundException('Backup job not found');
    return job;
  }

  googleRedirectSuccessUrl() {
    const web = this.config.get<string>('PUBLIC_WEB_URL') ?? this.config.get<string>('WEB_ORIGIN') ?? '';
    const base = web.split(',')[0]?.trim() || 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/settings?tab=backups&drive=connected`;
  }

  googleRedirectErrorUrl() {
    const web = this.config.get<string>('PUBLIC_WEB_URL') ?? this.config.get<string>('WEB_ORIGIN') ?? '';
    const base = web.split(',')[0]?.trim() || 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/settings?tab=backups&drive=error`;
  }
}
