import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { PlatformAdminGuard } from '../platform/platform-admin.guard';
import { PlatformAuditService } from '../platform/platform-audit.service';
import { PlatformHealthService } from './platform-health.service';
import { PlatformNotificationService } from './platform-notification.service';

@ApiTags('platform')
@Controller('platform')
@UseGuards(PlatformAdminGuard)
export class PlatformNotificationController {
  constructor(
    private readonly notifications: PlatformNotificationService,
    private readonly health: PlatformHealthService,
    private readonly platformAudit: PlatformAuditService,
  ) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Platform admin notification inbox' })
  list(
    @CurrentUser() user: RequestUser,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.listForAdmin(user.email, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('notifications/unread-count')
  unreadCount(@CurrentUser() user: RequestUser) {
    return this.notifications.unreadCount(user.email);
  }

  @Post('notifications/:id/read')
  async markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.notifications.markRead(user.email, id);
    await this.platformAudit.logPlatformAction({
      userId: user.id,
      adminEmail: user.email,
      action: 'platform_notification_read',
      entityType: 'PlatformNotification',
      entityId: id,
      auditAction: AuditAction.UPDATE,
    });
    return result;
  }

  @Post('notifications/read-all')
  async markAllRead(@CurrentUser() user: RequestUser) {
    const result = await this.notifications.markAllRead(user.email);
    await this.platformAudit.logPlatformAction({
      userId: user.id,
      adminEmail: user.email,
      action: 'platform_notification_read_all',
      entityType: 'PlatformNotification',
      entityId: user.id,
      auditAction: AuditAction.UPDATE,
    });
    return result;
  }

  @Get('health')
  @ApiOperation({ summary: 'Platform infrastructure health snapshot' })
  async healthSnapshot(@CurrentUser() user: RequestUser) {
    await this.platformAudit.logPlatformAction({
      userId: user.id,
      adminEmail: user.email,
      action: 'platform_health_view',
    });
    return this.health.collectSnapshot();
  }
}
