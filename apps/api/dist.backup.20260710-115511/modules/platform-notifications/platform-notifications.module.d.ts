import { OnModuleInit } from '@nestjs/common';
import { PlatformCheckScheduler } from './platform-check.scheduler';
export declare class PlatformNotificationsModule implements OnModuleInit {
    private readonly scheduler;
    constructor(scheduler: PlatformCheckScheduler);
    onModuleInit(): void;
}
