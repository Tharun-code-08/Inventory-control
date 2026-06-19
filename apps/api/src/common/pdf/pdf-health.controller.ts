import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PdfClusterService } from './pdf-cluster.service';

@ApiTags('pdf')
@Controller('pdf')
export class PdfHealthController {
  private readonly logger = new Logger(PdfHealthController.name);

  constructor(private readonly pdfCluster: PdfClusterService) {}

  @Get('health')
  async getPdfHealth() {
    try {
      const metrics = this.pdfCluster.getMetrics();

      return {
        success: true,
        data: {
          status: metrics.failedRenders > 0 ? 'degraded' : 'healthy',
          cluster: {
            activeBrowsers: metrics.activeBrowsers,
            activePages: metrics.activePages,
            queuedTasks: metrics.queuedTasks,
            successfulRenders: metrics.successfulRenders,
            failedRenders: metrics.failedRenders,
            avgRenderTimeMs: Math.round(metrics.avgRenderTime),
            memoryMB: metrics.memoryUsageMB,
            browserRestarts: metrics.browserRestarts,
          },
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch PDF health: ${(error as Error).message}`);
      throw error;
    }
  }
}
