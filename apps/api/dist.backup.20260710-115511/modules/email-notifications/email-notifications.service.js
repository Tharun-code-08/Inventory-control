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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailNotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const email_template_renderer_1 = require("../../common/mail/email-template.renderer");
const mail_service_1 = require("../../common/mail/mail.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const email_notifications_constants_1 = require("./email-notifications.constants");
let EmailNotificationsService = class EmailNotificationsService {
    prisma;
    mail;
    config;
    constructor(prisma, mail, config) {
        this.prisma = prisma;
        this.mail = mail;
        this.config = config;
    }
    assertOrgAdmin(user) {
        if (user.role !== client_1.RoleName.OWNER && user.role !== client_1.RoleName.ADMIN) {
            throw new common_1.ForbiddenException('Only organization admins can manage email notifications');
        }
    }
    configKey(shopId) {
        return `${email_notifications_constants_1.EMAIL_NOTIFICATIONS_CONFIG_PREFIX}:${shopId ?? 'global'}`;
    }
    normalizeConfig(raw) {
        const defaults = (0, email_notifications_constants_1.buildDefaultEmailNotificationsConfig)();
        if (!raw || typeof raw !== 'object')
            return defaults;
        const source = raw;
        const templates = { ...defaults.templates };
        for (const id of email_notifications_constants_1.EMAIL_TEMPLATE_IDS) {
            const row = source.templates?.[id];
            if (!row || typeof row !== 'object')
                continue;
            const current = row;
            templates[id] = {
                enabled: current.enabled ?? defaults.templates[id].enabled,
                subject: typeof current.subject === 'string' ? current.subject : defaults.templates[id].subject,
                bodyText: typeof current.bodyText === 'string' ? current.bodyText : defaults.templates[id].bodyText,
                bodyHtml: typeof current.bodyHtml === 'string' ? current.bodyHtml : defaults.templates[id].bodyHtml,
                cc: Array.isArray(current.cc) ? current.cc.filter((v) => typeof v === 'string') : [],
                bcc: Array.isArray(current.bcc) ? current.bcc.filter((v) => typeof v === 'string') : [],
            };
        }
        return {
            version: '1.0',
            templates,
            reminders: {
                paymentReminderEnabled: source.reminders?.paymentReminderEnabled ?? defaults.reminders.paymentReminderEnabled,
                paymentReminderDaysBefore: source.reminders?.paymentReminderDaysBefore?.filter((n) => Number.isFinite(n)) ??
                    defaults.reminders.paymentReminderDaysBefore,
            },
            internalAlerts: {
                lowStock: {
                    emailEnabled: source.internalAlerts?.lowStock?.emailEnabled ?? defaults.internalAlerts.lowStock.emailEnabled,
                    recipients: source.internalAlerts?.lowStock?.recipients ?? defaults.internalAlerts.lowStock.recipients,
                },
                rfqDeadline: {
                    emailEnabled: source.internalAlerts?.rfqDeadline?.emailEnabled ??
                        defaults.internalAlerts.rfqDeadline.emailEnabled,
                    recipients: source.internalAlerts?.rfqDeadline?.recipients ?? defaults.internalAlerts.rfqDeadline.recipients,
                },
                invoiceOverdue: {
                    emailEnabled: source.internalAlerts?.invoiceOverdue?.emailEnabled ??
                        defaults.internalAlerts.invoiceOverdue.emailEnabled,
                    recipients: source.internalAlerts?.invoiceOverdue?.recipients ??
                        defaults.internalAlerts.invoiceOverdue.recipients,
                },
                goodsReceiptPosted: {
                    emailEnabled: source.internalAlerts?.goodsReceiptPosted?.emailEnabled ??
                        defaults.internalAlerts.goodsReceiptPosted.emailEnabled,
                    recipients: source.internalAlerts?.goodsReceiptPosted?.recipients ??
                        defaults.internalAlerts.goodsReceiptPosted.recipients,
                },
            },
        };
    }
    async getEffectiveConfig(user, shopId) {
        this.assertOrgAdmin(user);
        const companyKey = this.configKey(null);
        const shopKey = shopId ? this.configKey(shopId) : null;
        const [companySetting, shopSetting] = await Promise.all([
            this.prisma.systemSetting.findUnique({ where: { key: companyKey } }),
            shopKey ? this.prisma.systemSetting.findUnique({ where: { key: shopKey } }) : null,
        ]);
        const companyConfig = this.normalizeConfig(companySetting?.value);
        const shopConfig = shopSetting ? this.normalizeConfig(shopSetting.value) : null;
        const merged = shopConfig
            ? {
                ...companyConfig,
                ...shopConfig,
                templates: { ...companyConfig.templates, ...shopConfig.templates },
                reminders: { ...companyConfig.reminders, ...shopConfig.reminders },
                internalAlerts: { ...companyConfig.internalAlerts, ...shopConfig.internalAlerts },
                isOverride: true,
            }
            : { ...companyConfig, isOverride: false };
        return {
            config: merged,
            definitions: email_notifications_constants_1.EMAIL_TEMPLATE_DEFINITIONS,
            sender: this.getSenderStatus(),
        };
    }
    getSenderStatus() {
        const from = this.config.get('MAIL_FROM') ?? process.env.MAIL_FROM ?? '';
        const replyTo = this.config.get('MAIL_REPLY_TO') ?? process.env.MAIL_REPLY_TO ?? from;
        const bcc = this.config.get('MAIL_BCC') ?? process.env.MAIL_BCC ?? '';
        return {
            configured: this.mail.isConfigured(),
            from: from || 'office@softdigitconsulting.com',
            replyTo,
            bcc,
            domainAuthenticated: null,
            guidance: 'Authenticate your sending domain with SPF and DKIM at your DNS provider so emails are less likely to land in spam.',
        };
    }
    async saveCompanyDefaults(user, dto) {
        this.assertOrgAdmin(user);
        const value = this.normalizeConfig(dto);
        await this.prisma.systemSetting.upsert({
            where: { key: this.configKey(null) },
            update: { value: value, updatedById: user.id },
            create: {
                key: this.configKey(null),
                value: value,
                createdById: user.id,
                updatedById: user.id,
            },
        });
        return this.getEffectiveConfig(user);
    }
    async saveShopOverrides(user, shopId, dto) {
        this.assertOrgAdmin(user);
        const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { id: true, companyId: true } });
        if (!shop)
            throw new common_1.NotFoundException('Shop not found');
        if (user.companyId && shop.companyId !== user.companyId) {
            throw new common_1.ForbiddenException('Shop does not belong to your organization');
        }
        const value = this.normalizeConfig(dto);
        await this.prisma.systemSetting.upsert({
            where: { key: this.configKey(shopId) },
            update: { value: value, updatedById: user.id },
            create: {
                key: this.configKey(shopId),
                value: value,
                createdById: user.id,
                updatedById: user.id,
            },
        });
        return this.getEffectiveConfig(user, shopId);
    }
    previewTemplate(_user, dto) {
        const def = (0, email_notifications_constants_1.getTemplateDefinition)(dto.templateId);
        const sample = dto.sampleContext ?? {};
        const context = {
            supplier_name: 'Acme Supplies',
            customer_name: 'Sample Customer',
            rfq_number: 'RFQ-HQ001-202605-00001',
            rfq_title: 'Office consumables',
            deadline: '30 May 2026',
            portal_url: 'https://example.com/portal',
            access_code: 'AB12CD34',
            po_number: 'PO-HQ001-202605-00013',
            po_date: '26 May 2026',
            shop_name: 'HQ Plant',
            total_value: '₹12,500.00',
            total_amount: '₹12,500.00',
            quote_number: 'SQT-HQ001-202605-00004',
            quote_date: '26 May 2026',
            valid_until: '10 Jun 2026',
            return_number: 'SRT-HQ001-202605-00002',
            gr_number: 'GR-HQ001-202605-00013',
            invoice_number: 'INV-HQ001-202605-00007',
            invoice_date: '26 May 2026',
            due_date: '10 Jun 2026',
            receipt_number: 'PAY-HQ001-202605-00003',
            amount_paid: '₹5,000.00',
            balance_due: '₹7,500.00',
            payment_type: 'Partial',
            days_until_due: '3',
            invitee_name: 'Alex User',
            invitee_email: 'alex@example.com',
            inviter_name: 'Admin User',
            role_name: 'Store Keeper',
            invite_url: 'https://example.com/invite/accept',
            company_name: 'Softdigit Consulting',
            ...sample,
        };
        const overrides = dto.template ?? {};
        return (0, email_template_renderer_1.mergeTemplateContent)({
            subject: def.defaultSubject,
            text: def.defaultBodyText,
            html: def.defaultBodyHtml,
            overrides: {
                subject: overrides.subject,
                bodyText: overrides.bodyText,
                bodyHtml: overrides.bodyHtml,
            },
            context,
            templateId: dto.templateId,
        });
    }
    async resolveConfigForShop(shopId) {
        const companySetting = await this.prisma.systemSetting.findUnique({
            where: { key: this.configKey(null) },
        });
        const shopSetting = shopId
            ? await this.prisma.systemSetting.findUnique({ where: { key: this.configKey(shopId) } })
            : null;
        const companyConfig = this.normalizeConfig(companySetting?.value);
        const shopConfig = shopSetting ? this.normalizeConfig(shopSetting.value) : null;
        if (!shopConfig)
            return companyConfig;
        return {
            ...companyConfig,
            templates: { ...companyConfig.templates, ...shopConfig.templates },
            reminders: { ...companyConfig.reminders, ...shopConfig.reminders },
            internalAlerts: { ...companyConfig.internalAlerts, ...shopConfig.internalAlerts },
        };
    }
    prepareTemplate(config, templateId, defaults, context) {
        const template = config.templates[templateId];
        if (!template?.enabled)
            return { enabled: false };
        const rendered = (0, email_template_renderer_1.mergeTemplateContent)({
            subject: defaults.subject,
            text: defaults.text,
            html: defaults.html,
            overrides: {
                subject: template.subject,
                bodyText: template.bodyText,
                bodyHtml: template.bodyHtml,
            },
            context,
            templateId,
        });
        return {
            enabled: true,
            ...rendered,
            cc: template.cc?.filter(Boolean),
            bcc: template.bcc?.filter(Boolean),
        };
    }
    async prepareTemplateForShop(shopId, templateId, defaults, context) {
        const config = await this.resolveConfigForShop(shopId);
        return this.prepareTemplate(config, templateId, defaults, context);
    }
    async hasDeliveryLog(args) {
        const row = await this.prisma.emailDeliveryLog.findUnique({
            where: {
                templateId_entityType_entityId_recipient: {
                    templateId: args.templateId,
                    entityType: args.entityType,
                    entityId: args.entityId,
                    recipient: args.recipient.toLowerCase(),
                },
            },
        });
        return Boolean(row);
    }
    async logDelivery(args) {
        await this.prisma.emailDeliveryLog.create({
            data: {
                templateId: args.templateId,
                entityType: args.entityType,
                entityId: args.entityId,
                recipient: args.recipient.toLowerCase(),
            },
        });
    }
    async resolveInternalRecipients(shopId, tokens) {
        const emails = new Set();
        const adminFallback = this.config.get('ADMIN_NOTIFICATION_EMAIL') ??
            process.env.ADMIN_NOTIFICATION_EMAIL ??
            '';
        for (const token of tokens) {
            if (token.includes('@')) {
                emails.add(token.toLowerCase());
                continue;
            }
        }
        const roleNames = new Set([client_1.RoleName.ADMIN, client_1.RoleName.OWNER]);
        for (const token of tokens) {
            if (token === 'role:inventory') {
                roleNames.add(client_1.RoleName.INVENTORY_MANAGER);
                roleNames.add(client_1.RoleName.WAREHOUSE_STAFF);
            }
            if (token === 'role:procurement') {
                roleNames.add(client_1.RoleName.PURCHASE_MANAGER);
            }
        }
        const users = await this.prisma.user.findMany({
            where: {
                isActive: true,
                deletedAt: null,
                ...(shopId ? { shopId } : {}),
                role: { name: { in: [...roleNames] } },
            },
            select: { email: true },
            take: 30,
        });
        users.forEach((user) => emails.add(user.email.toLowerCase()));
        if (shopId) {
            const shop = await this.prisma.shop.findUnique({
                where: { id: shopId },
                select: { email: true },
            });
            if (shop?.email)
                emails.add(shop.email.toLowerCase());
        }
        if (emails.size === 0 && adminFallback) {
            emails.add(adminFallback.toLowerCase());
        }
        return [...emails];
    }
    async sendInternalAlert(args) {
        const config = await this.resolveConfigForShop(args.shopId);
        const alertConfig = config.internalAlerts[args.alertKey];
        if (!alertConfig.emailEnabled)
            return { sent: 0 };
        if (!this.mail.isConfigured())
            return { sent: 0, skipped: 'SMTP not configured' };
        const recipients = await this.resolveInternalRecipients(args.shopId, alertConfig.recipients);
        if (recipients.length === 0)
            return { sent: 0, skipped: 'No recipients' };
        let companyId = null;
        if (args.shopId) {
            const shop = await this.prisma.shop.findUnique({
                where: { id: args.shopId },
                select: { companyId: true },
            });
            companyId = shop?.companyId ?? null;
        }
        if (!companyId)
            return { sent: 0, skipped: 'No company context' };
        const { internalAlertHtml, internalAlertSubject, internalAlertText } = await Promise.resolve().then(() => require('../../common/mail/transactional-email.templates'));
        const content = {
            title: args.title,
            message: args.message,
            companyName: args.companyName ?? 'Softdigit Consulting',
        };
        let sent = 0;
        for (const to of recipients) {
            if (args.dedupe) {
                const alreadySent = await this.hasDeliveryLog({
                    ...args.dedupe,
                    recipient: to,
                });
                if (alreadySent)
                    continue;
            }
            await this.mail.sendTenantMail(companyId, {
                to,
                subject: internalAlertSubject(content),
                text: internalAlertText(content),
                html: internalAlertHtml(content),
                fromName: content.companyName,
                attachments: args.attachments,
            });
            if (args.dedupe) {
                await this.logDelivery({
                    ...args.dedupe,
                    recipient: to,
                });
            }
            sent += 1;
        }
        return { sent };
    }
};
exports.EmailNotificationsService = EmailNotificationsService;
exports.EmailNotificationsService = EmailNotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        config_1.ConfigService])
], EmailNotificationsService);
//# sourceMappingURL=email-notifications.service.js.map