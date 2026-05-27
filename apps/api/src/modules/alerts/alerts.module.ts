import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';

@Module({
  imports: [NotificationsModule, EmailNotificationsModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
