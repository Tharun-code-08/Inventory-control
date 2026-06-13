import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';
import { RequestContextStore } from '@/common/context/request-context';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      ...this.healthService.getHealth(),
      requestId: RequestContextStore.getRequestId(),
    };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return {
      ...this.healthService.getLive(),
      requestId: RequestContextStore.getRequestId(),
    };
  }

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
