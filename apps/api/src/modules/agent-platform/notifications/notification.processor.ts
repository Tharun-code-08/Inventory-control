import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  ChannelLinkStatus,
  ChatChannel,
  ChatMessageStatus,
  ConversationStatus,
  MessageDirection,
  type Conversation,
  type UserChannelLink,
} from '@prisma/client';
import { Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportsService } from '@/modules/reports/reports.service';
import { WhatsAppAdapter } from '../channels/whatsapp/whatsapp.adapter';
import { LinkService } from '../link/link.service';
import {
  NOTIFICATION_QUEUE,
  type DailySummaryJob,
  type LowStockAlertJob,
  type NotificationJob,
  type OverduePaymentJob,
} from './notification-jobs';

type AnalyticsResult = {
  totalRevenue?: unknown;
  salesOrderCount?: unknown;
  lowStockCount?: unknown;
  overdueInvoiceCount?: unknown;
};

type LowStockRow = { description?: string; product_code?: string; current_stock?: unknown; min_stock_level?: unknown };

type AgingRow = { customerName?: string; overdue_amount?: unknown; overdue_invoice_count?: unknown; oldest_overdue_days?: unknown };

type AgingResult = { data?: AgingRow[]; summary?: { total_overdue?: unknown; overdue_customers?: unknown; oldest_overdue_days?: unknown } };

type TemplateParam = { type: 'text'; text: string };
type TemplateComponent = { type: string; parameters?: TemplateParam[] };

type NotificationPayload =
  | { kind: 'text'; body: string }
  | { kind: 'template'; name: string; components: TemplateComponent[] };

function p(text: string): TemplateParam {
  return { type: 'text', text: String(text) };
}

function num(value: unknown, fallback = '0'): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? String(n) : fallback;
}

function amount(value: unknown): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : String(value ?? '0');
}

/**
 * Processes scheduled notification jobs: daily summary, low-stock alert, and
 * overdue-payment reminder. Each job sends one WhatsApp message to every active
 * linked user in the company. Failures for one user don't block others.
 *
 * If the WhatsApp adapter is unconfigured, the job throws UnrecoverableError
 * (no retry storms). If feature flags disable notifications for a company the
 * job is silently skipped per user.
 */
@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly links: LinkService,
    private readonly adapter: WhatsAppAdapter,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<{ sent: number }> {
    if (!this.adapter.isConfigured()) {
      throw new UnrecoverableError('WhatsApp adapter not configured; notification skipped');
    }

    const { type, companyId } = job.data;
    const activeLinks = await this.activeLinks(companyId);
    if (activeLinks.length === 0) return { sent: 0 };

    let sent = 0;
    for (const link of activeLinks) {
      try {
        const user = await this.links.buildRequestUser(link);
        if (!user) continue;

        const userName = await this.resolveUserName(user.id);
        const companyName = await this.resolveCompanyName(link.companyId);

        let payload: NotificationPayload | null = null;
        if (type === 'daily_summary') {
          payload = await this.buildDailySummary(job.data as DailySummaryJob, user as never, companyName);
        } else if (type === 'low_stock_alert') {
          payload = await this.buildLowStockAlert(job.data as LowStockAlertJob, user as never, userName, companyName);
        } else if (type === 'overdue_payment') {
          payload = await this.buildOverduePayment(job.data as OverduePaymentJob, user as never, userName, companyName);
        }

        if (payload) {
          await this.sendToLink(link, payload);
          sent++;
        }
      } catch (err) {
        this.logger.warn(
          `Notification ${type} for link ${link.id} failed: ${(err as Error).message}`,
        );
      }
    }
    return { sent };
  }

  private async buildDailySummary(
    _job: DailySummaryJob,
    user: Parameters<ReportsService['analyticsOverview']>[0],
    companyName: string,
  ): Promise<NotificationPayload | null> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    let overview: AnalyticsResult;
    try {
      overview = (await this.reports.analyticsOverview(user, {
        date_from: yStr,
        date_to: yStr,
      })) as AnalyticsResult;
    } catch {
      return null;
    }

    // Template: header={{1}}=companyName; body {{1}}=date, {{2}}=orders, {{3}}=revenue, {{4}}=lowStock, {{5}}=overdue
    return {
      kind: 'template',
      name: 'daily_business_summary',
      components: [
        {
          type: 'header',
          parameters: [p(companyName)],
        },
        {
          type: 'body',
          parameters: [
            p(yStr),
            p(num(overview.salesOrderCount)),
            p(amount(overview.totalRevenue)),
            p(num(overview.lowStockCount)),
            p(num(overview.overdueInvoiceCount)),
          ],
        },
      ],
    };
  }

  private async buildLowStockAlert(
    _job: LowStockAlertJob,
    user: Parameters<ReportsService['lowStock']>[0],
    userName: string,
    companyName: string,
  ): Promise<NotificationPayload | null> {
    let items: LowStockRow[];
    try {
      items = (await this.reports.lowStock(user)) as LowStockRow[];
    } catch {
      return null;
    }
    if (items.length === 0) return null;

    const MAX_LINES = 5;
    const shown = items.slice(0, MAX_LINES);
    const more = items.length - MAX_LINES;
    const lines = shown.map(
      (r) => `• ${r.description ?? r.product_code ?? 'Unknown'}: ${r.current_stock ?? 0} (min ${r.min_stock_level ?? 0})`,
    );
    if (more > 0) lines.push(`…and ${more} more`);
    const itemsList = lines.join('\n');

    // Template: body {{1}}=userName, {{2}}=companyName, {{3}}=itemsList
    return {
      kind: 'template',
      name: 'low_stock_alert',
      components: [
        {
          type: 'body',
          parameters: [p(userName), p(companyName), p(itemsList)],
        },
      ],
    };
  }

  private async buildOverduePayment(
    _job: OverduePaymentJob,
    user: Parameters<ReportsService['customerAging']>[0],
    userName: string,
    companyName: string,
  ): Promise<NotificationPayload | null> {
    let result: AgingResult;
    try {
      result = (await this.reports.customerAging(user, {
        show_overdue_only: true,
        sort_by: 'overdueAmount',
        limit: 5,
      })) as AgingResult;
    } catch {
      return null;
    }

    const customers = result.data ?? [];
    if (customers.length === 0) return null;

    const overdueCount = num(result.summary?.overdue_customers ?? customers.length);
    const totalAmount = amount(result.summary?.total_overdue);
    const oldestDays = num(result.summary?.oldest_overdue_days ?? customers[0]?.oldest_overdue_days ?? 0);

    // Template: header={{1}}=userName; body {{1}}=userName, {{2}}=count, {{3}}=company, {{4}}=amount, {{5}}=days
    return {
      kind: 'template',
      name: 'overdue_payment_reminder',
      components: [
        {
          type: 'header',
          parameters: [p(userName)],
        },
        {
          type: 'body',
          parameters: [
            p(userName),
            p(overdueCount),
            p(companyName),
            p(totalAmount),
            p(oldestDays),
          ],
        },
      ],
    };
  }

  private async resolveUserName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return user?.name ?? 'there';
  }

  private async resolveCompanyName(companyId: string | null): Promise<string> {
    if (!companyId) return 'your company';
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { companyName: true } });
    return company?.companyName ?? 'your company';
  }

  private async activeLinks(companyId: string): Promise<UserChannelLink[]> {
    return this.prisma.userChannelLink.findMany({
      where: {
        companyId,
        channel: ChatChannel.WHATSAPP,
        status: ChannelLinkStatus.ACTIVE,
      },
    });
  }

  private async sendToLink(link: UserChannelLink, payload: NotificationPayload): Promise<void> {
    const body = payload.kind === 'text' ? payload.body : `[${payload.name}]`;
    const conversation = await this.getOrCreateConversation(link);
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUT,
        body,
        status: ChatMessageStatus.QUEUED,
      },
    });

    let result: { providerMessageId: string | null };
    if (payload.kind === 'template') {
      result = await this.adapter.sendTemplate({
        to: link.phoneNumber,
        name: payload.name,
        languageCode: 'en',
        components: payload.components,
      });
    } else {
      result = await this.adapter.sendText({ to: link.phoneNumber, body: payload.body });
    }

    await this.prisma.message.update({
      where: { id: message.id },
      data: {
        status: ChatMessageStatus.SENT,
        waMessageId: result.providerMessageId,
        error: null,
      },
    });
  }

  private async getOrCreateConversation(link: UserChannelLink): Promise<Conversation> {
    const existing = await this.prisma.conversation.findFirst({
      where: { userChannelLinkId: link.id, status: ConversationStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.prisma.conversation.create({
      data: { companyId: link.companyId, userChannelLinkId: link.id },
    });
  }
}
