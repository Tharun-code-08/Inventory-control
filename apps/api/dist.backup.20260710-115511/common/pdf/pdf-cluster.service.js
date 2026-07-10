"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PdfClusterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfClusterService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const puppeteer_cluster_1 = require("puppeteer-cluster");
let PdfClusterService = PdfClusterService_1 = class PdfClusterService {
    config;
    logger = new common_1.Logger(PdfClusterService_1.name);
    cluster = null;
    metrics = {
        activeBrowsers: 0,
        activePages: 0,
        queuedTasks: 0,
        successfulRenders: 0,
        failedRenders: 0,
        avgRenderTime: 0,
        memoryUsageMB: 0,
        browserRestarts: 0,
    };
    renderTimes = [];
    renderCount = 0;
    totalRenderTime = 0;
    lastBrowserRestart = new Date();
    constructor(config) {
        this.config = config;
    }
    isPuppeteerEnabled() {
        return this.config.get('PUPPETEER_ENABLED', true);
    }
    async onModuleInit() {
        if (!this.isPuppeteerEnabled()) {
            this.logger.warn('⚠️  Puppeteer disabled - PDF generation will fail');
            return;
        }
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
        }
        catch (error) {
            this.logger.error(`Failed to initialize Puppeteer cluster: ${error.message}`);
            throw error;
        }
    }
    async onModuleDestroy() {
        if (this.cluster) {
            await this.cluster.close();
            this.logger.log('✓ Puppeteer cluster closed');
        }
    }
    async initializeCluster() {
        const maxConcurrency = this.config.get('PDF_CLUSTER_MAX_CONCURRENCY', 4);
        const executablePath = this.config.get('PUPPETEER_EXECUTABLE_PATH');
        this.logger.log(`Launching Puppeteer cluster (executable: ${executablePath || 'default'})`);
        this.cluster = await puppeteer_cluster_1.Cluster.launch({
            concurrency: puppeteer_cluster_1.Cluster.CONCURRENCY_PAGE,
            maxConcurrency,
            puppeteerOptions: {
                headless: true,
                executablePath: executablePath || undefined,
                args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            },
            timeout: 120000,
            retryLimit: 2,
            retryDelay: 5000,
            monitor: true,
        });
        this.metrics.activeBrowsers = 1;
        this.logger.log(`✓ Puppeteer cluster initialized (concurrency: ${maxConcurrency})`);
    }
    async renderPdf(html, options) {
        await this.ensureClusterInitialized();
        if (!this.cluster) {
            throw new Error('Puppeteer cluster not available - PDF generation disabled');
        }
        const startTime = Date.now();
        try {
            const buffer = await this.cluster.execute(async ({ page, browser }) => {
                await this.checkBrowserHealth(browser);
                await page.setContent(html, { waitUntil: 'networkidle0' });
                const pdf = await page.pdf({
                    format: 'A4',
                    printBackground: true,
                    scale: options?.scale || 1,
                });
                return pdf;
            });
            const renderTime = Date.now() - startTime;
            this.renderCount++;
            this.totalRenderTime += renderTime;
            this.renderTimes.push(renderTime);
            if (this.renderTimes.length > 100) {
                this.renderTimes.shift();
            }
            this.metrics.successfulRenders++;
            this.metrics.avgRenderTime =
                this.renderTimes.length > 0 ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length : 0;
            this.logger.debug(`PDF rendered in ${renderTime}ms`);
            return buffer;
        }
        catch (error) {
            this.metrics.failedRenders++;
            this.logger.error(`PDF rendering failed: ${error.message}`);
            throw error;
        }
    }
    async checkBrowserHealth(_browser) {
        const shouldRestart = this.renderCount > 100 || this.getMemoryUsage() > 1000 || this.getBrowserUptime() > 3600000;
        if (shouldRestart) {
            this.logger.warn(`Browser restart triggered (renders: ${this.renderCount}, memory: ${this.getMemoryUsage()}MB, uptime: ${this.getBrowserUptime()}ms)`);
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
    getMemoryUsage() {
        const usage = process.memoryUsage();
        return Math.round((usage.rss + usage.heapUsed) / 1024 / 1024);
    }
    getBrowserUptime() {
        return Date.now() - this.lastBrowserRestart.getTime();
    }
    getMetrics() {
        return {
            ...this.metrics,
            memoryUsageMB: this.getMemoryUsage(),
        };
    }
};
exports.PdfClusterService = PdfClusterService;
exports.PdfClusterService = PdfClusterService = PdfClusterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PdfClusterService);
//# sourceMappingURL=pdf-cluster.service.js.map