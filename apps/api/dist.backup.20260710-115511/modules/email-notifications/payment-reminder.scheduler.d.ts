import { Queue } from 'bullmq';
export declare class PaymentReminderScheduler {
    private readonly queue;
    private readonly logger;
    constructor(queue: Queue);
    registerRepeatableJob(): Promise<void>;
}
