import { OnModuleInit } from '@nestjs/common';
import { PaymentReminderScheduler } from './payment-reminder.scheduler';
export declare class EmailNotificationsModule implements OnModuleInit {
    private readonly scheduler;
    constructor(scheduler: PaymentReminderScheduler);
    onModuleInit(): void;
}
