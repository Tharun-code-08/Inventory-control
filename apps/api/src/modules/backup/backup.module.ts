import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { BackupProcessor } from './backup.processor';
import { BackupService } from './backup.service';
import { GoogleDriveService } from './google-drive.service';
import { TenantBackupService } from './tenant-backup.service';
import { BillingModule } from '../billing/billing.module';
import { AuditModule } from '../audit/audit.module';
import { BACKUP_QUEUE } from './backup.constants';
import { MailModule } from '../../common/mail/mail.module';

@Module({
  imports: [BullModule.registerQueue({ name: BACKUP_QUEUE }), BillingModule, AuditModule, MailModule],
  controllers: [BackupController],
  providers: [BackupService, BackupProcessor, GoogleDriveService, TenantBackupService],
  exports: [BackupService],
})
export class BackupModule {}
