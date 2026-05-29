import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformSubscriptionsService } from './platform-subscriptions.service';

@ApiTags('platform')
@Controller('platform/subscriptions')
@UseGuards(PlatformAdminGuard)
export class PlatformSubscriptionsController {
  constructor(private readonly platform: PlatformSubscriptionsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform super-admin subscription conversion dashboard' })
  async dashboard() {
    return this.platform.getDashboard();
  }
}
