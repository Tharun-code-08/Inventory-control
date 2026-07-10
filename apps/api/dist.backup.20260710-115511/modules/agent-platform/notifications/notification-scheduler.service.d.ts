import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from "../../../prisma/prisma.service";
import { type NotificationJob } from './notification-jobs';
export declare class NotificationSchedulerService implements OnApplicationBootstrap {
    private readonly prisma;
    private readonly config;
    private readonly queue;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, queue: Queue<NotificationJob>);
    onApplicationBootstrap(): Promise<void>;
    private scheduleAll;
    private upsertRepeatable;
    scheduleForCompany(companyId: string): Promise<void>;
    notificationsEnabled(): boolean;
    private dailyCron;
    private lowStockCron;
    private overduePaymentCron;
}
