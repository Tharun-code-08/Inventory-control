import { QueueService } from './queue.service';
export declare class QueueMetricsController {
    private readonly queueService;
    private readonly logger;
    constructor(queueService: QueueService);
    getQueueStats(): Promise<{
        success: boolean;
        data: {
            metrics: any[];
            timestamp: Date;
        };
    }>;
    getQueueStatsByName(queueName: string): Promise<{
        success: boolean;
        data: any;
    }>;
    getQueuesHealth(): Promise<{
        success: boolean;
        data: {
            status: string;
            totalQueues: number;
            totalActive: any;
            totalFailed: any;
            totalWaiting: any;
            queues: any[];
        };
    }>;
}
