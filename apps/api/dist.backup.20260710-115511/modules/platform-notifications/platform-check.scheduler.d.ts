import { Queue } from 'bullmq';
export declare class PlatformCheckScheduler {
    private readonly queue;
    private readonly logger;
    constructor(queue: Queue);
    registerRepeatableJobs(): Promise<void>;
}
