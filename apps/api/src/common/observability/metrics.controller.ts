import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { PlatformAdminGuard } from '@/modules/platform/platform-admin.guard';
import { MetricsService } from './metrics.service';

@ApiTags('observability')
@ApiBearerAuth()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Prometheus scrape endpoint. Behind `user:manage` because exposing process
   * memory/event-loop metrics to anonymous callers makes it easier to time
   * attacks that try to fingerprint the deployment. The registry is
   * platform-wide, so tenant admins are not enough: platform admins only.
   */
  @RequirePermission('user:manage')
  @UseGuards(PlatformAdminGuard)
  @Get()
  async scrape(@Res() res: Response): Promise<void> {
    const body = await this.metrics.registry.metrics();
    res.set('content-type', this.metrics.registry.contentType);
    res.send(body);
  }
}
