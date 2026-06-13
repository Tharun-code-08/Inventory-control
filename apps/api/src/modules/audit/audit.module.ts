import { Global, Module } from '@nestjs/common';
import { AuditExportRateLimitGuard } from '@/common/guards/audit-export-rate-limit.guard';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Global()
@Module({
  providers: [AuditService, AuditExportRateLimitGuard],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
