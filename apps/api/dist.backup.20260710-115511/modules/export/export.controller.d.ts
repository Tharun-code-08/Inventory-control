import { Queue } from 'bullmq';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
export declare class ExportController {
    private readonly exportsQueue;
    private readonly config;
    constructor(exportsQueue: Queue, config: ConfigService);
    status(jobId: string): Promise<{
        status: import("bullmq").JobState | "unknown";
        downloadUrl: string | undefined;
        fileName: string | undefined;
    }>;
    file(fileName: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
