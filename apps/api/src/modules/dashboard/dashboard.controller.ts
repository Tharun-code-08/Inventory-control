import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @RequirePermission('report:view')
  @Get('summary')
  summary(@CurrentUser() user: RequestUser, @Query('shop_id') shopId?: string) {
    return this.dashboard.summary(user, shopId);
  }

  // Month 1: Executive Dashboard - 4 cards, 30 seconds
  @RequirePermission('report:view')
  @Get('executive')
  async executive(@CurrentUser() user: RequestUser, @Query('shop_id') shopId?: string) {
    return this.dashboard.executive(user, shopId);
  }
}
