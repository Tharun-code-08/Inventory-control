import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { PlatformNotificationService } from './platform-notification.service';
export declare class PlatformHealthService {
    private readonly prisma;
    private readonly config;
    private readonly metrics;
    private readonly notifications;
    private lastHttpErrorTotal;
    constructor(prisma: PrismaService, config: ConfigService, metrics: MetricsService, notifications: PlatformNotificationService);
    collectSnapshot(): Promise<{
        timestamp: string;
        database: {
            sizeBytes: number;
            limitBytes: number;
            usagePct: number;
        };
        disk: {
            path: string;
            freePct: number;
            freeBytes: number;
        }[];
        queues: Record<string, {
            waiting: number;
            active: number;
            failed: number;
            delayed: number;
        }>;
        cpuLoadPct: number;
        memoryUsagePct: number;
        httpErrorsDelta5m: number;
    }>;
    private getDatabaseSizeBytes;
    private getDiskUsage;
    private getQueueStats;
    private getCpuLoadPct;
    private getMemoryUsagePct;
    private getHttpErrorDelta;
    runHealthChecks(): Promise<{
        dispatched: number;
        snapshot: {
            timestamp: string;
            database: {
                sizeBytes: number;
                limitBytes: number;
                usagePct: number;
            };
            disk: {
                path: string;
                freePct: number;
                freeBytes: number;
            }[];
            queues: Record<string, {
                waiting: number;
                active: number;
                failed: number;
                delayed: number;
            }>;
            cpuLoadPct: number;
            memoryUsagePct: number;
            httpErrorsDelta5m: number;
        };
    }>;
}
