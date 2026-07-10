import { HealthService } from './health.service';
export declare class HealthController {
    private healthService;
    constructor(healthService: HealthService);
    health(): {
        requestId: string | undefined;
        status: string;
        timestamp: string;
    };
    live(): {
        requestId: string | undefined;
        status: string;
        uptimeSeconds: number;
        memoryMB: {
            rss: number;
            heapUsed: number;
            heapTotal: number;
        };
        nodeVersion: string;
        pid: number;
    };
    ready(): Promise<{
        requestId: string | undefined;
        timestamp: string;
        status: string;
        database: string;
    }>;
}
