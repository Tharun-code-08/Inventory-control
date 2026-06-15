import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';
import { RequestContextStore } from '@/common/context/request-context';
import { Public } from '@/common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      ...this.healthService.getHealth(),
      requestId: RequestContextStore.getRequestId(),
    };
  }

  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return {
      ...this.healthService.getLive(),
      requestId: RequestContextStore.getRequestId(),
    };
  }

  @Public()
  @Get('ready')
  async ready() {
    const healthStatus = await this.healthService.getReady();
    return {
      ...healthStatus,
      requestId: RequestContextStore.getRequestId(),
      timestamp: new Date().toISOString(),
    };
  }
}
