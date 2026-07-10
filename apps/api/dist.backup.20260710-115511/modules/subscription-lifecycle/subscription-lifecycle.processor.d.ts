import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EngagementTrackerService } from './engagement-tracker.service';
import { LifecycleOrchestratorService } from './lifecycle-orchestrator.service';
import { PlatformLifecycleMailService } from './platform-lifecycle-mail.service';
export declare class SubscriptionLifecycleProcessor extends WorkerHost {
    private readonly prisma;
    private readonly mail;
    private readonly engagement;
    private readonly lifecycleMail;
    private readonly orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, mail: MailService, engagement: EngagementTrackerService, lifecycleMail: PlatformLifecycleMailService, orchestrator: LifecycleOrchestratorService);
    process(_job: Job): Promise<{
        sent: number;
        skipped: string;
        expiredTrials?: undefined;
    } | {
        sent: number;
        expiredTrials: number;
        skipped?: undefined;
    }>;
}
