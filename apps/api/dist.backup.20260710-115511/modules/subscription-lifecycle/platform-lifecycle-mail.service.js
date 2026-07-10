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
var PlatformLifecycleMailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformLifecycleMailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const lifecycle_email_template_1 = require("../../common/mail/platform/lifecycle-email.template");
const subscription_welcome_template_1 = require("../../common/mail/platform/subscription-welcome.template");
const trial_welcome_template_1 = require("../../common/mail/platform/trial-welcome.template");
const mail_service_1 = require("../../common/mail/mail.service");
const plan_config_1 = require("../../common/plans/plan-config");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const lifecycle_rules_constants_1 = require("./lifecycle-rules.constants");
const subscription_lifecycle_constants_1 = require("./subscription-lifecycle.constants");
const prisma_service_1 = require("../../prisma/prisma.service");
let PlatformLifecycleMailService = PlatformLifecycleMailService_1 = class PlatformLifecycleMailService {
    mail;
    emailNotifications;
    config;
    prisma;
    logger = new common_1.Logger(PlatformLifecycleMailService_1.name);
    constructor(mail, emailNotifications, config, prisma) {
        this.mail = mail;
        this.emailNotifications = emailNotifications;
        this.config = config;
        this.prisma = prisma;
    }
    webBase() {
        return (0, subscription_lifecycle_constants_1.platformWebBaseUrl)(this.config.get('WEB_APP_URL'));
    }
    async sendCampaignEmail(args) {
        const campaign = lifecycle_rules_constants_1.LIFECYCLE_CAMPAIGN_MAP.get(args.campaignKey);
        if (!campaign)
            return { sent: false, reason: 'Unknown campaign' };
        if (campaign.marketing && args.marketingOptOut) {
            await this.markEnrollment(args.companyId, args.campaignKey, client_1.LifecycleCampaignStatus.SKIPPED);
            return { sent: false, reason: 'Marketing opt-out' };
        }
        if (!this.mail.isConfigured()) {
            return { sent: false, reason: 'SMTP not configured' };
        }
        const templateId = args.campaignKey.startsWith('platform_')
            ? args.campaignKey
            : `platform_${args.campaignKey}`;
        const alreadySent = await this.emailNotifications.hasDeliveryLog({
            templateId,
            entityType: 'company',
            entityId: args.companyId,
            recipient: args.recipient,
        });
        if (alreadySent)
            return { sent: false, reason: 'Already sent' };
        const baseUrl = this.webBase();
        const loginUrl = `${baseUrl}/login`;
        const upgradeUrl = `${baseUrl}${campaign.ctaPath ?? '/upgrade'}`;
        const unsubscribeUrl = (0, subscription_lifecycle_constants_1.marketingUnsubscribeUrl)(baseUrl, args.companyId);
        const content = {
            title: args.context?.title?.toString() ?? campaign.title,
            subtitle: campaign.subtitle,
            greeting: `Hi ${args.companyName},`,
            paragraphs: campaign.paragraphs.map((p) => p.replace(/\{\{(\w+)\}\}/g, (_, key) => String(args.context?.[key] ?? ''))),
            bullets: campaign.bullets,
            cta: campaign.ctaPath
                ? { label: campaign.ctaLabel ?? 'Open SoftdigitIMS', url: upgradeUrl }
                : undefined,
            unsubscribeUrl: campaign.transactional ? undefined : unsubscribeUrl,
            transactional: campaign.transactional,
        };
        const subject = (0, lifecycle_email_template_1.lifecycleEmailSubject)(content.title, args.companyName);
        const text = (0, lifecycle_email_template_1.lifecycleEmailText)(content);
        let html = (0, lifecycle_email_template_1.lifecycleEmailHtml)(content);
        if (campaign.key === 'platform_trial_welcome') {
            const trialDays = (0, plan_config_1.getTrialDays)();
            const trialEndsAt = args.context?.trialEndsAt?.toString() ?? '';
            html = (0, trial_welcome_template_1.trialWelcomeHtml)({
                companyName: args.companyName,
                trialDays,
                trialEndsAt,
                loginUrl,
                upgradeUrl,
                unsubscribeUrl,
            });
        }
        const delivery = await this.mail.sendPlatformMail({
            to: args.recipient,
            subject: campaign.key === 'platform_trial_welcome'
                ? (0, trial_welcome_template_1.trialWelcomeSubject)({
                    companyName: args.companyName,
                    trialDays: (0, plan_config_1.getTrialDays)(),
                    trialEndsAt: args.context?.trialEndsAt?.toString() ?? '',
                    loginUrl,
                    upgradeUrl,
                })
                : subject,
            text: campaign.key === 'platform_trial_welcome'
                ? (0, trial_welcome_template_1.trialWelcomeText)({
                    companyName: args.companyName,
                    trialDays: (0, plan_config_1.getTrialDays)(),
                    trialEndsAt: args.context?.trialEndsAt?.toString() ?? '',
                    loginUrl,
                    upgradeUrl,
                })
                : text,
            html,
        });
        void delivery;
        await this.emailNotifications.logDelivery({
            templateId,
            entityType: 'company',
            entityId: args.companyId,
            recipient: args.recipient,
        });
        await this.markEnrollment(args.companyId, args.campaignKey, client_1.LifecycleCampaignStatus.SENT);
        this.logger.log(`Sent ${args.campaignKey} to ${args.recipient} (company ${args.companyId})`);
        return { sent: true };
    }
    async sendSubscriptionWelcome(args) {
        const templateId = 'platform_subscription_welcome';
        const alreadySent = await this.emailNotifications.hasDeliveryLog({
            templateId,
            entityType: 'company',
            entityId: args.companyId,
            recipient: args.recipient,
        });
        if (alreadySent || !this.mail.isConfigured())
            return { sent: false };
        const loginUrl = `${this.webBase()}/login`;
        const ctx = {
            companyName: args.companyName,
            planName: args.planName,
            billingCycle: args.billingCycle,
            amountDisplay: args.amountDisplay,
            loginUrl,
            invoiceNumber: args.invoiceNumber,
        };
        await this.mail.sendPlatformMail({
            to: args.recipient,
            subject: (0, subscription_welcome_template_1.subscriptionWelcomeSubject)(ctx),
            text: (0, subscription_welcome_template_1.subscriptionWelcomeText)(ctx),
            html: (0, subscription_welcome_template_1.subscriptionWelcomeHtml)(ctx),
            attachments: args.invoicePdf
                ? [
                    {
                        filename: args.invoiceNumber ? `${args.invoiceNumber}.pdf` : 'subscription-invoice.pdf',
                        content: args.invoicePdf,
                        contentType: 'application/pdf',
                    },
                ]
                : undefined,
        });
        await this.emailNotifications.logDelivery({
            templateId,
            entityType: 'company',
            entityId: args.companyId,
            recipient: args.recipient,
        });
        await this.markEnrollment(args.companyId, 'platform_subscription_welcome', client_1.LifecycleCampaignStatus.SENT);
        return { sent: true };
    }
    async markEnrollment(companyId, campaignKey, status, emailDeliveryLogId) {
        await this.prisma.lifecycleCampaignEnrollment.upsert({
            where: { companyId_campaignKey: { companyId, campaignKey } },
            create: {
                companyId,
                campaignKey,
                status,
                sentAt: status === client_1.LifecycleCampaignStatus.SENT ? new Date() : undefined,
                emailDeliveryLogId,
            },
            update: {
                status,
                sentAt: status === client_1.LifecycleCampaignStatus.SENT ? new Date() : undefined,
                emailDeliveryLogId,
            },
        });
    }
};
exports.PlatformLifecycleMailService = PlatformLifecycleMailService;
exports.PlatformLifecycleMailService = PlatformLifecycleMailService = PlatformLifecycleMailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mail_service_1.MailService,
        email_notifications_service_1.EmailNotificationsService,
        config_1.ConfigService,
        prisma_service_1.PrismaService])
], PlatformLifecycleMailService);
//# sourceMappingURL=platform-lifecycle-mail.service.js.map