import { Module } from '@nestjs/common';
import { CacheModule } from '../../common/cache/cache.module';
import { BillingModule } from '../billing/billing.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [BillingModule, EmailNotificationsModule, CacheModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
