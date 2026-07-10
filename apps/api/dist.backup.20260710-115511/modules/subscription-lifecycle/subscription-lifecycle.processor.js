"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SubscriptionLifecycleProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionLifecycleProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const mail_service_1 = require("../../common/mail/mail.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const engagement_tracker_service_1 = require("./engagement-tracker.service");
const lifecycle_orchestrator_service_1 = require("./lifecycle-orchestrator.service");
const platform_lifecycle_mail_service_1 = require("./platform-lifecycle-mail.service");
const subscription_lifecycle_constants_1 = require("./subscription-lifecycle.constants");
let SubscriptionLifecycleProcessor = SubscriptionLifecycleProcessor_1 = class SubscriptionLifecycleProcessor extends bullmq_1.WorkerHost {
    prisma;
    mail;
    engagement;
    lifecycleMail;
    orchestrator;
    logger = new common_1.Logger(SubscriptionLifecycleProcessor_1.name);
    constructor(prisma, mail, engagement, lifecycleMail, orchestrator) {
        super();
        this.prisma = prisma;
        this.mail = mail;
        this.engagement = engagement;
        this.lifecycleMail = lifecycleMail;
        this.orchestrator = orchestrator;
    }
    async process(_job) {
        void _job;
        if (!this.mail.isConfigured()) {
            this.logger.warn('Lifecycle job skipped: SMTP not configured');
            return { sent: 0, skipped: 'SMTP not configured' };
        }
        const today = new Date();
        await this.engagement.runDailySnapshot(today);
        const expiredTrialIds = await this.engagement.expireTrialsPastEnd(today);
        for (const companyId of expiredTrialIds) {
            const owner = await this.orchestrator.resolveOwnerEmail(companyId);
            if (owner) {
                await this.orchestrator.onTrialExpired({
                    companyId,
                    ownerEmail: owner.email,
                    companyName: owner.companyName,
                });
            }
        }
        const companies = await this.prisma.company.findMany({
            where: { isActive: true },
            select: {
                id: true,
                companyName: true,
                subscriptionPlan: true,
                subscriptionStatus: true,
                trialStartsAt: true,
                trialEndsAt: true,
                subscriptionEndsAt: true,
                billingCycle: true,
                paidActivatedAt: true,
                createdAt: true,
                platformMarketingOptOut: true,
            },
        });
        const snapshotDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        let sent = 0;
        for (const company of companies) {
            const snapshot = await this.prisma.companyEngagementSnapshot.findUnique({
                where: { companyId_snapshotDate: { companyId: company.id, snapshotDate } },
            });
            const keys = this.engagement.eligibleCampaignKeys(company, today, snapshot
                ? {
                    lastLoginAt: snapshot.lastLoginAt,
                    featuresUsed: snapshot.featuresUsed,
                }
                : undefined);
            if (keys.length === 0)
                continue;
            const owner = await this.orchestrator.resolveOwnerEmail(company.id);
            if (!owner)
                continue;
            for (const campaignKey of keys) {
                const result = await this.lifecycleMail.sendCampaignEmail({
                    companyId: company.id,
                    companyName: company.companyName,
                    recipient: owner.email,
                    campaignKey,
                    marketingOptOut: company.platformMarketingOptOut,
                });
                if (result.sent)
                    sent += 1;
            }
        }
        this.logger.log(`Lifecycle daily job complete: ${sent} emails sent`);
        return { sent, expiredTrials: expiredTrialIds.length };
    }
};
exports.SubscriptionLifecycleProcessor = SubscriptionLifecycleProcessor;
exports.SubscriptionLifecycleProcessor = SubscriptionLifecycleProcessor = SubscriptionLifecycleProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(subscription_lifecycle_constants_1.SUBSCRIPTION_LIFECYCLE_QUEUE),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        engagement_tracker_service_1.EngagementTrackerService,
        platform_lifecycle_mail_service_1.PlatformLifecycleMailService,
        lifecycle_orchestrator_service_1.LifecycleOrchestratorService])
], SubscriptionLifecycleProcessor);
//# sourceMappingURL=subscription-lifecycle.processor.js.map