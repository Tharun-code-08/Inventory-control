import { Queue } from 'bullmq';
export declare class SubscriptionLifecycleScheduler {
    private readonly queue;
    private readonly logger;
    constructor(queue: Queue);
    registerRepeatableJob(): Promise<void>;
}
