import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';
import { NotificationService } from './services/notification.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationController } from './notifications.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  providers: [
    // Legacy queue-based delivery (used by alerts/email flows).
    NotificationsProcessor,
    NotificationsService,
    // Sprint 3: persisted in-app notifications + per-user preferences.
    NotificationService,
    NotificationPreferenceService,
  ],
  controllers: [NotificationController],
  exports: [NotificationsService, NotificationService, NotificationPreferenceService],
})
export class NotificationsModule {}
