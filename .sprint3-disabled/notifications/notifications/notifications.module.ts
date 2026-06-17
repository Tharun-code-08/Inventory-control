import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationService } from './services/notification.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationController } from './notifications.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  providers: [
    PrismaService,
    NotificationsProcessor,
    NotificationService,
    NotificationPreferenceService,
  ],
  controllers: [NotificationController],
  exports: [NotificationService, NotificationPreferenceService],
})
export class NotificationsModule {}
