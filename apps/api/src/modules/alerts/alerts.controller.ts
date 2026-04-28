import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @RequirePermission('report:view')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.alerts.list(user);
  }

  @RequirePermission('report:view')
  @Post(':id/read')
  markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.alerts.markRead(user, id);
  }

  @RequirePermission('report:view')
  @Post('run-checks')
  runChecks() {
    return this.alerts.runAutomationChecks();
  }
}

