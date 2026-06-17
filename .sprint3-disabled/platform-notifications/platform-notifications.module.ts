import { BullModule } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import { MailModule } from '../../common/mail/mail.module';
import { ObservabilityModule } from '../../common/observability/observability.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlatformAdminGuard } from '../platform/platform-admin.guard';
import { PlatformAuditService } from '../platform/platform-audit.service';
import { PLATFORM_CHECKS_QUEUE } from './platform-notification.constants';
import { PlatformCheckProcessor } from './platform-check.processor';
import { PlatformCheckScheduler } from './platform-check.scheduler';
import { PlatformHealthService } from './platform-health.service';
import { PlatformNotificationController } from './platform-notification.controller';
import { PlatformNotificationService } from './platform-notification.service';
import { PlatformRevenueService } from './platform-revenue.service';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    ObservabilityModule,
    BullModule.registerQueue({ name: PLATFORM_CHECKS_QUEUE }),
  ],
  controllers: [PlatformNotificationController],
  providers: [
    PlatformAdminGuard,
    PlatformAuditService,
    PlatformNotificationService,
    PlatformRevenueService,
    PlatformHealthService,
    PlatformCheckProcessor,
    PlatformCheckScheduler,
  ],
  exports: [PlatformNotificationService, PlatformRevenueService, PlatformHealthService],
})
export class PlatformNotificationsModule implements OnModuleInit {
  constructor(private readonly scheduler: PlatformCheckScheduler) {}

  onModuleInit() {
    void this.scheduler.registerRepeatableJobs();
  }
}
