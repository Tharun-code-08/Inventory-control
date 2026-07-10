import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PlatformHealthService } from './platform-health.service';
import { PlatformRevenueService } from './platform-revenue.service';
export declare class PlatformCheckProcessor extends WorkerHost {
    private readonly health;
    private readonly revenue;
    private readonly logger;
    constructor(health: PlatformHealthService, revenue: PlatformRevenueService);
    process(job: Job<{
        kind: string;
    }>): Promise<{
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
    } | {
        mrr: number;
        dispatched: number;
    } | {
        skipped: boolean;
    }>;
}
