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
};

type LowStockRow = { description?: string; product_code?: string; current_stock?: unknown; min_stock_level?: unknown };

type AgingRow = { customerName?: string; overdue_amount?: unknown; overdue_invoice_count?: unknown };

type AgingResult = { data?: AgingRow[]; summary?: { total_overdue?: unknown; overdue_customers?: unknown } };

function money(value: unknown): string {
  const num = Number(value ?? 0);
  return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
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

        let body: string | null = null;
        if (type === 'daily_summary') {
          body = await this.buildDailySummary(job.data as DailySummaryJob, user as never);
        } else if (type === 'low_stock_alert') {
          body = await this.buildLowStockAlert(job.data as LowStockAlertJob, user as never);
        } else if (type === 'overdue_payment') {
          body = await this.buildOverduePayment(job.data as OverduePaymentJob, user as never);
        }

        if (body) {
          await this.sendToLink(link, body);
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
  ): Promise<string | null> {
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

    const revenue = money(overview.totalRevenue);
    const orders = Number(overview.salesOrderCount ?? 0);
    const lowStockCount = Number(overview.lowStockCount ?? 0);

    return [
      `📊 *Daily Summary — ${yStr}*`,
      `- Sales: ${orders} order${Number(orders) === 1 ? '' : 's'} totalling ${revenue}`,
      `- Low-stock items: ${lowStockCount}`,
      lowStockCount > 0 ? 'Ask me "which items are low on stock?" for details.' : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async buildLowStockAlert(
    _job: LowStockAlertJob,
    user: Parameters<ReportsService['lowStock']>[0],
  ): Promise<string | null> {
    let items: LowStockRow[];
    try {
      items = (await this.reports.lowStock(user)) as LowStockRow[];
    } catch {
      return null;
    }
    if (items.length === 0) return null;

    const MAX_LINES = 8;
    const shown = items.slice(0, MAX_LINES);
    const more = items.length - MAX_LINES;
    const lines = shown.map(
      (r) =>
        `- ${r.description ?? r.product_code ?? 'Unknown'}: ${r.current_stock ?? 0} (min ${r.min_stock_level ?? 0})`,
    );
    if (more > 0) lines.push(`…and ${more} more`);

    return [`⚠️ *Low Stock Alert* — ${items.length} item${items.length === 1 ? '' : 's'} need attention`, ...lines].join('\n');
  }

  private async buildOverduePayment(
    _job: OverduePaymentJob,
    user: Parameters<ReportsService['customerAging']>[0],
  ): Promise<string | null> {
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

    const totalOverdue = money(result.summary?.total_overdue);
    const overdueCount = Number(result.summary?.overdue_customers ?? customers.length);
    const lines = customers.map(
      (c) =>
        `- ${c.customerName ?? 'Customer'}: ${money(c.overdue_amount)} (${c.overdue_invoice_count ?? 0} invoice${Number(c.overdue_invoice_count ?? 0) === 1 ? '' : 's'})`,
    );

    return [
      `💰 *Overdue Payment Reminder* — ${overdueCount} customer${overdueCount === 1 ? '' : 's'} (${totalOverdue} total)`,
      ...lines,
      'Open Invoices in the ERP to follow up.',
    ].join('\n');
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

  private async sendToLink(link: UserChannelLink, body: string): Promise<void> {
    const conversation = await this.getOrCreateConversation(link);
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUT,
        body,
        status: ChatMessageStatus.QUEUED,
      },
    });
    // Send directly (notifications are non-interactive; no need for a separate queue hop).
    const result = await this.adapter.sendText({
      to: link.phoneNumber,
      body,
    });
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
