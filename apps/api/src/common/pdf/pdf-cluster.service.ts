import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cluster } from 'puppeteer-cluster';

export interface PdfClusterMetrics {
  activeBrowsers: number;
  activePages: number;
  queuedTasks: number;
  successfulRenders: number;
  failedRenders: number;
  avgRenderTime: number;
  memoryUsageMB: number;
  browserRestarts: number;
}

@Injectable()
export class PdfClusterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfClusterService.name);
  private cluster: Cluster | null = null;
  private metrics: PdfClusterMetrics = {
    activeBrowsers: 0,
    activePages: 0,
    queuedTasks: 0,
    successfulRenders: 0,
    failedRenders: 0,
    avgRenderTime: 0,
    memoryUsageMB: 0,
    browserRestarts: 0,
  };

  private renderTimes: number[] = [];
  private renderCount = 0;
  private totalRenderTime = 0;
  private lastBrowserRestart: Date = new Date();

  constructor(private readonly config: ConfigService) {}

  private isPuppeteerEnabled(): boolean {
    return this.config.get<boolean>('PUPPETEER_ENABLED', true);
  }

  async onModuleInit() {
    if (!this.isPuppeteerEnabled()) {
      this.logger.warn('⚠️  Puppeteer disabled - PDF generation will fail');
      return;
    }
    // Defer cluster initialization to lazy loading (when first PDF is rendered)
    this.logger.log('✓ PDF cluster service initialized (cluster will launch on first use)');
  }

  async ensureClusterInitialized() {
    if (this.cluster) {
      return;
    }

    if (!this.isPuppeteerEnabled()) {
      throw new Error('Puppeteer is disabled via PUPPETEER_ENABLED=false');
    }

    try {
      await this.initializeCluster();
      this.logger.log('✓ Puppeteer cluster initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize Puppeteer cluster: ${(error as Error).message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.cluster) {
      await this.cluster.close();
      this.logger.log('✓ Puppeteer cluster closed');
    }
  }

  private async initializeCluster() {
    const maxConcurrency = this.config.get<number>('PDF_CLUSTER_MAX_CONCURRENCY', 4);
    const executablePath = this.config.get<string>('PUPPETEER_EXECUTABLE_PATH');

    this.logger.log(`Launching Puppeteer cluster (executable: ${executablePath || 'default'})`);

    this.cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_PAGE,
      maxConcurrency,
      puppeteerOptions: {
        headless: true as any,
        executablePath: executablePath || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      },
      timeout: 120000, // 2 minutes
      retryLimit: 2,
      retryDelay: 5000,
      monitor: true,
    });

    this.metrics.activeBrowsers = 1; // Cluster manages one browser internally
    this.logger.log(`✓ Puppeteer cluster initialized (concurrency: ${maxConcurrency})`);
  }

  async renderPdf(html: string, options?: { filename?: string; scale?: number }): Promise<Buffer> {
    // Ensure cluster is initialized on first use
    await this.ensureClusterInitialized();

    if (!this.cluster) {
      throw new Error('Puppeteer cluster not available - PDF generation disabled');
    }

    const startTime = Date.now();

    try {
      const buffer = await this.cluster.execute(
        async ({ page, browser }: { page: any; browser: any }) => {
          // Check if browser needs restart (after 100 renders, 1GB RAM, or 1 hour)
          await this.checkBrowserHealth(browser);

          // Set content and wait for rendering
          await page.setContent(html, { waitUntil: 'networkidle0' });

          // Generate PDF
          const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            scale: options?.scale || 1,
          });

          return pdf;
        },
      );

      // Track metrics
      const renderTime = Date.now() - startTime;
      this.renderCount++;
      this.totalRenderTime += renderTime;
      this.renderTimes.push(renderTime);
      if (this.renderTimes.length > 100) {
        this.renderTimes.shift(); // Keep only last 100 for average
      }

      this.metrics.successfulRenders++;
      this.metrics.avgRenderTime =
        this.renderTimes.length > 0 ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length : 0;

      this.logger.debug(`PDF rendered in ${renderTime}ms`);
      return buffer as Buffer;
    } catch (error) {
      this.metrics.failedRenders++;
      this.logger.error(`PDF rendering failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async checkBrowserHealth(_browser: any) {
    // Restart browser if:
    // 1. More than 100 PDFs rendered
    // 2. Memory usage > 1GB
    // 3. Uptime > 1 hour

    const shouldRestart =
      this.renderCount > 100 || this.getMemoryUsage() > 1000 || this.getBrowserUptime() > 3600000; // 1 hour

    if (shouldRestart) {
      this.logger.warn(
        `Browser restart triggered (renders: ${this.renderCount}, memory: ${this.getMemoryUsage()}MB, uptime: ${this.getBrowserUptime()}ms)`,
      );

      // Close and recreate cluster
      if (this.cluster) {
        await this.cluster.close();
      }

      await this.initializeCluster();
      this.renderCount = 0;
      this.totalRenderTime = 0;
      this.renderTimes = [];
      this.lastBrowserRestart = new Date();
      this.metrics.browserRestarts++;

      this.logger.log('Browser restarted successfully');
    }
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round((usage.rss + usage.heapUsed) / 1024 / 1024); // Convert to MB
  }

  private getBrowserUptime(): number {
    return Date.now() - this.lastBrowserRestart.getTime();
  }

  getMetrics(): PdfClusterMetrics {
    return {
      ...this.metrics,
      memoryUsageMB: this.getMemoryUsage(),
    };
  }
}
