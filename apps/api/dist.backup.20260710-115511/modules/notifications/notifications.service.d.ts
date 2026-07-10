import { Queue } from 'bullmq';
import type { NotificationJob } from './notifications.processor';
export declare class NotificationsService {
    private readonly queue;
    private readonly logger;
    constructor(queue: Queue<NotificationJob>);
    enqueue(payload: NotificationJob): Promise<void>;
}
