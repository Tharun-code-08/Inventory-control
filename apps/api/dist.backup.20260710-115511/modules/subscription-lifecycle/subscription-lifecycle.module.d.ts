import { OnModuleInit } from '@nestjs/common';
import { SubscriptionLifecycleScheduler } from './subscription-lifecycle.scheduler';
export declare class SubscriptionLifecycleModule implements OnModuleInit {
    private readonly scheduler;
    constructor(scheduler: SubscriptionLifecycleScheduler);
    onModuleInit(): void;
}
