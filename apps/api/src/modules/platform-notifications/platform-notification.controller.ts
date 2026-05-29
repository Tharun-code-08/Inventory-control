import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { PlatformAdminGuard } from '../platform/platform-admin.guard';
import { PlatformHealthService } from './platform-health.service';
import { PlatformNotificationService } from './platform-notification.service';

@ApiTags('platform')
@Controller('platform')
@UseGuards(PlatformAdminGuard)
export class PlatformNotificationController {
  constructor(
    private readonly notifications: PlatformNotificationService,
    private readonly health: PlatformHealthService,
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
  markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notifications.markRead(user.email, id);
  }

  @Post('notifications/read-all')
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.email);
  }

  @Get('health')
  @ApiOperation({ summary: 'Platform infrastructure health snapshot' })
  healthSnapshot() {
    return this.health.collectSnapshot();
  }
}
