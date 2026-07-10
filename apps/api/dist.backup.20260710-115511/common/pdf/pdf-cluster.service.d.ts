import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export declare class PdfClusterService implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private cluster;
    private metrics;
    private renderTimes;
    private renderCount;
    private totalRenderTime;
    private lastBrowserRestart;
    constructor(config: ConfigService);
    private isPuppeteerEnabled;
    onModuleInit(): Promise<void>;
    ensureClusterInitialized(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private initializeCluster;
    renderPdf(html: string, options?: {
        filename?: string;
        scale?: number;
    }): Promise<Buffer>;
    private checkBrowserHealth;
    private getMemoryUsage;
    private getBrowserUptime;
    getMetrics(): PdfClusterMetrics;
}
