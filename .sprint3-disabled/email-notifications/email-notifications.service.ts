import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RoleName } from '@prisma/client';
import { mergeTemplateContent, type TemplateContext } from '../../common/mail/email-template.renderer';
import { MailService } from '../../common/mail/mail.service';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildDefaultEmailNotificationsConfig,
  EMAIL_NOTIFICATIONS_CONFIG_PREFIX,
  EMAIL_TEMPLATE_DEFINITIONS,
  EMAIL_TEMPLATE_IDS,
  getTemplateDefinition,
  type EmailNotificationsConfig,
  type EmailTemplateId,
} from './email-notifications.constants';
import type { PreviewEmailTemplateDto, UpdateEmailNotificationsDto } from './dto/update-email-notifications.dto';
import type { EmailTemplateConfig } from './email-notifications.constants';

type PreparedEmail = {
  enabled: true;
  subject: string;
  text: string;
  html: string;
  cc?: string[];
  bcc?: string[];
};

@Injectable()
export class EmailNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private assertOrgAdmin(user: RequestUser) {
    if (user.role !== RoleName.OWNER && user.role !== RoleName.ADMIN) {
      throw new ForbiddenException('Only organization admins can manage email notifications');
    }
  }

  private configKey(shopId?: string | null) {
    return `${EMAIL_NOTIFICATIONS_CONFIG_PREFIX}:${shopId ?? 'global'}`;
  }

  private normalizeConfig(raw: unknown): EmailNotificationsConfig {
    const defaults = buildDefaultEmailNotificationsConfig();
    if (!raw || typeof raw !== 'object') return defaults;
    const source = raw as Partial<EmailNotificationsConfig>;
    const templates = { ...defaults.templates };
    for (const id of EMAIL_TEMPLATE_IDS) {
      const row = (source.templates as Record<string, unknown> | undefined)?.[id];
      if (!row || typeof row !== 'object') continue;
      const current = row as Partial<(typeof templates)[EmailTemplateId]>;
      templates[id] = {
        enabled: current.enabled ?? defaults.templates[id].enabled,
        subject: typeof current.subject === 'string' ? current.subject : defaults.templates[id].subject,
        bodyText: typeof current.bodyText === 'string' ? current.bodyText : defaults.templates[id].bodyText,
        bodyHtml: typeof current.bodyHtml === 'string' ? current.bodyHtml : defaults.templates[id].bodyHtml,
        cc: Array.isArray(current.cc) ? current.cc.filter((v): v is string => typeof v === 'string') : [],
        bcc: Array.isArray(current.bcc) ? current.bcc.filter((v): v is string => typeof v === 'string') : [],
      };
    }
    return {
      version: '1.0',
      templates,
      reminders: {
        paymentReminderEnabled:
          source.reminders?.paymentReminderEnabled ?? defaults.reminders.paymentReminderEnabled,
        paymentReminderDaysBefore:
          source.reminders?.paymentReminderDaysBefore?.filter((n) => Number.isFinite(n)) ??
          defaults.reminders.paymentReminderDaysBefore,
      },
      internalAlerts: {
        lowStock: {
          emailEnabled:
            source.internalAlerts?.lowStock?.emailEnabled ?? defaults.internalAlerts.lowStock.emailEnabled,
          recipients:
            source.internalAlerts?.lowStock?.recipients ?? defaults.internalAlerts.lowStock.recipients,
        },
        rfqDeadline: {
          emailEnabled:
            source.internalAlerts?.rfqDeadline?.emailEnabled ??
            defaults.internalAlerts.rfqDeadline.emailEnabled,
          recipients:
            source.internalAlerts?.rfqDeadline?.recipients ?? defaults.internalAlerts.rfqDeadline.recipients,
        },
        invoiceOverdue: {
          emailEnabled:
            source.internalAlerts?.invoiceOverdue?.emailEnabled ??
            defaults.internalAlerts.invoiceOverdue.emailEnabled,
          recipients:
            source.internalAlerts?.invoiceOverdue?.recipients ??
            defaults.internalAlerts.invoiceOverdue.recipients,
        },
        goodsReceiptPosted: {
          emailEnabled:
            source.internalAlerts?.goodsReceiptPosted?.emailEnabled ??
            defaults.internalAlerts.goodsReceiptPosted.emailEnabled,
          recipients:
            source.internalAlerts?.goodsReceiptPosted?.recipients ??
            defaults.internalAlerts.goodsReceiptPosted.recipients,
        },
      },
    };
  }

  async getEffectiveConfig(user: RequestUser, shopId?: string | null) {
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
      definitions: EMAIL_TEMPLATE_DEFINITIONS,
      sender: this.getSenderStatus(),
    };
  }

  getSenderStatus() {
    const from = this.config.get<string>('MAIL_FROM') ?? process.env.MAIL_FROM ?? '';
    const replyTo = this.config.get<string>('MAIL_REPLY_TO') ?? process.env.MAIL_REPLY_TO ?? from;
    const bcc = this.config.get<string>('MAIL_BCC') ?? process.env.MAIL_BCC ?? '';
    return {
      configured: this.mail.isConfigured(),
      from: from || 'office@softdigitconsulting.com',
      replyTo,
      bcc,
      domainAuthenticated: null as boolean | null,
      guidance:
        'Authenticate your sending domain with SPF and DKIM at your DNS provider so emails are less likely to land in spam.',
    };
  }

  async saveCompanyDefaults(user: RequestUser, dto: UpdateEmailNotificationsDto) {
    this.assertOrgAdmin(user);
    const value = this.normalizeConfig(dto);
    await this.prisma.systemSetting.upsert({
      where: { key: this.configKey(null) },
      update: { value: value as unknown as Prisma.InputJsonValue, updatedById: user.id },
      create: {
        key: this.configKey(null),
        value: value as unknown as Prisma.InputJsonValue,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    return this.getEffectiveConfig(user);
  }

  async saveShopOverrides(user: RequestUser, shopId: string, dto: UpdateEmailNotificationsDto) {
    this.assertOrgAdmin(user);
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { id: true, companyId: true } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (user.companyId && shop.companyId !== user.companyId) {
      throw new ForbiddenException('Shop does not belong to your organization');
    }
    const value = this.normalizeConfig(dto);
    await this.prisma.systemSetting.upsert({
      where: { key: this.configKey(shopId) },
      update: { value: value as unknown as Prisma.InputJsonValue, updatedById: user.id },
      create: {
        key: this.configKey(shopId),
        value: value as unknown as Prisma.InputJsonValue,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    return this.getEffectiveConfig(user, shopId);
  }

  previewTemplate(_user: RequestUser, dto: PreviewEmailTemplateDto) {
    const def = getTemplateDefinition(dto.templateId);
    const sample = dto.sampleContext ?? {};
    const context: TemplateContext = {
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
    const overrides: Partial<EmailTemplateConfig> = dto.template ?? {};
    return mergeTemplateContent({
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

  async resolveConfigForShop(shopId?: string | null): Promise<EmailNotificationsConfig> {
    const companySetting = await this.prisma.systemSetting.findUnique({
      where: { key: this.configKey(null) },
    });
    const shopSetting = shopId
      ? await this.prisma.systemSetting.findUnique({ where: { key: this.configKey(shopId) } })
      : null;
    const companyConfig = this.normalizeConfig(companySetting?.value);
    const shopConfig = shopSetting ? this.normalizeConfig(shopSetting.value) : null;
    if (!shopConfig) return companyConfig;
    return {
      ...companyConfig,
      templates: { ...companyConfig.templates, ...shopConfig.templates },
      reminders: { ...companyConfig.reminders, ...shopConfig.reminders },
      internalAlerts: { ...companyConfig.internalAlerts, ...shopConfig.internalAlerts },
    };
  }

  prepareTemplate(
    config: EmailNotificationsConfig,
    templateId: EmailTemplateId,
    defaults: { subject: string; text: string; html: string },
    context: TemplateContext,
  ): PreparedEmail | { enabled: false } {
    const template = config.templates[templateId];
    if (!template?.enabled) return { enabled: false };
    const rendered = mergeTemplateContent({
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

  async prepareTemplateForShop(
    shopId: string | null | undefined,
    templateId: EmailTemplateId,
    defaults: { subject: string; text: string; html: string },
    context: TemplateContext,
  ) {
    const config = await this.resolveConfigForShop(shopId);
    return this.prepareTemplate(config, templateId, defaults, context);
  }

  async hasDeliveryLog(args: {
    templateId: string;
    entityType: string;
    entityId: string;
    recipient: string;
  }) {
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

  async logDelivery(args: {
    templateId: string;
    entityType: string;
    entityId: string;
    recipient: string;
  }) {
    await this.prisma.emailDeliveryLog.create({
      data: {
        templateId: args.templateId,
        entityType: args.entityType,
        entityId: args.entityId,
        recipient: args.recipient.toLowerCase(),
      },
    });
  }

  async resolveInternalRecipients(shopId: string | null | undefined, tokens: string[]) {
    const emails = new Set<string>();
    const adminFallback =
      this.config.get<string>('ADMIN_NOTIFICATION_EMAIL') ??
      process.env.ADMIN_NOTIFICATION_EMAIL ??
      '';

    for (const token of tokens) {
      if (token.includes('@')) {
        emails.add(token.toLowerCase());
        continue;
      }
    }

    const roleNames = new Set<RoleName>([RoleName.ADMIN, RoleName.OWNER]);
    for (const token of tokens) {
      if (token === 'role:inventory') {
        roleNames.add(RoleName.INVENTORY_MANAGER);
        roleNames.add(RoleName.WAREHOUSE_STAFF);
      }
      if (token === 'role:procurement') {
        roleNames.add(RoleName.PURCHASE_MANAGER);
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
      if (shop?.email) emails.add(shop.email.toLowerCase());
    }

    if (emails.size === 0 && adminFallback) {
      emails.add(adminFallback.toLowerCase());
    }
    return [...emails];
  }

  async sendInternalAlert(args: {
    shopId?: string | null;
    alertKey: keyof EmailNotificationsConfig['internalAlerts'];
    title: string;
    message: string;
    companyName?: string;
    attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
    dedupe?: {
      templateId: string;
      entityType: string;
      entityId: string;
    };
  }) {
    const config = await this.resolveConfigForShop(args.shopId);
    const alertConfig = config.internalAlerts[args.alertKey];
    if (!alertConfig.emailEnabled) return { sent: 0 };
    if (!this.mail.isConfigured()) return { sent: 0, skipped: 'SMTP not configured' };

    const recipients = await this.resolveInternalRecipients(args.shopId, alertConfig.recipients);
    if (recipients.length === 0) return { sent: 0, skipped: 'No recipients' };

    let companyId: string | null = null;
    if (args.shopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: args.shopId },
        select: { companyId: true },
      });
      companyId = shop?.companyId ?? null;
    }
    if (!companyId) return { sent: 0, skipped: 'No company context' };

    const { internalAlertHtml, internalAlertSubject, internalAlertText } = await import(
      '../../common/mail/transactional-email.templates'
    );
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
        if (alreadySent) continue;
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
}
