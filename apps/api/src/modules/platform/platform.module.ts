import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionLifecycleModule } from '../subscription-lifecycle/subscription-lifecycle.module';
import { EmailTrackingController } from './email-tracking.controller';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformSubscriptionsController } from './platform-subscriptions.controller';
import { PlatformSubscriptionsService } from './platform-subscriptions.service';

@Module({
  imports: [PrismaModule, SubscriptionLifecycleModule],
  controllers: [PlatformSubscriptionsController, EmailTrackingController],
  providers: [PlatformSubscriptionsService, PlatformAdminGuard],
})
export class PlatformModule {}
