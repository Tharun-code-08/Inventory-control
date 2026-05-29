import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from '../../common/mail/mail.module';
import { PdfModule } from '../../common/pdf/pdf.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { EngagementTrackerService } from './engagement-tracker.service';
import { LifecycleOrchestratorService } from './lifecycle-orchestrator.service';
import { PlatformLifecycleMailService } from './platform-lifecycle-mail.service';
import { SubscriptionInvoiceService } from './subscription-invoice.service';
import { SubscriptionLifecycleProcessor } from './subscription-lifecycle.processor';
import { SubscriptionLifecycleScheduler } from './subscription-lifecycle.scheduler';
import { SUBSCRIPTION_LIFECYCLE_QUEUE } from './subscription-lifecycle.constants';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    PdfModule,
    EmailNotificationsModule,
    BullModule.registerQueue({ name: SUBSCRIPTION_LIFECYCLE_QUEUE }),
  ],
  providers: [
    SubscriptionInvoiceService,
    PlatformLifecycleMailService,
    LifecycleOrchestratorService,
    EngagementTrackerService,
    SubscriptionLifecycleProcessor,
    SubscriptionLifecycleScheduler,
  ],
  exports: [
    SubscriptionInvoiceService,
    LifecycleOrchestratorService,
    EngagementTrackerService,
    PlatformLifecycleMailService,
  ],
})
export class SubscriptionLifecycleModule implements OnModuleInit {
  constructor(private readonly scheduler: SubscriptionLifecycleScheduler) {}

  onModuleInit() {
    void this.scheduler.registerRepeatableJob();
  }
}
