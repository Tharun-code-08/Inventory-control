import { PrismaService } from "../../prisma/prisma.service";
export declare class HealthService {
    private prisma;
    constructor(prisma: PrismaService);
    getHealth(): {
        status: string;
        timestamp: string;
    };
    getLive(): {
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
    getReady(): Promise<{
        status: string;
        database: string;
    }>;
}
