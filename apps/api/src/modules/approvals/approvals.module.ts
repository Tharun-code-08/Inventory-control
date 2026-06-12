import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ApprovalService } from './services/approval.service';
import { ApprovalController } from './approvals.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [PrismaService, ApprovalService],
  controllers: [ApprovalController],
  exports: [ApprovalService],
})
export class ApprovalsModule {}
