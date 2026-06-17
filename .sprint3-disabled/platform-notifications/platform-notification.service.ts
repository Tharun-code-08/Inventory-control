import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PlatformNotificationCategory,
  PlatformNotificationSeverity,
} from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePlatformAdminEmailsFromConfig } from '../platform/platform-admin.util';

export type DispatchPlatformNotificationArgs = {
  category: PlatformNotificationCategory;
  severity: PlatformNotificationSeverity;
  notificationKey: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  companyId?: string | null;
  dedupeHours?: number;
  emailImmediate?: boolean;
  emailDedupe?: {
    templateId: string;
    entityType: string;
    entityId: string;
  };
};

@Injectable()
export class PlatformNotificationService {
  private readonly logger = new Logger(PlatformNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly mail: MailService | null = null,
  ) {}

  parseAdminEmails(): string[] {
    return [...parsePlatformAdminEmailsFromConfig(this.config)];
  }

  private async hasRecentDuplicate(args: {
    notificationKey: string;
    referenceId?: string | null;
    dedupeHours: number;
  }) {
    const since = new Date(Date.now() - args.dedupeHours * 60 * 60 * 1000);
    const existing = await this.prisma.platformNotification.findFirst({
      where: {
        notificationKey: args.notificationKey,
        referenceId: args.referenceId ?? null,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async dispatch(args: DispatchPlatformNotificationArgs) {
    const dedupeHours = args.dedupeHours ?? 24;
    const duplicate = await this.hasRecentDuplicate({
      notificationKey: args.notificationKey,
      referenceId: args.referenceId,
      dedupeHours,
    });
    if (duplicate) return { skipped: 'duplicate' as const };

    const notification = await this.prisma.platformNotification.create({
      data: {
        category: args.category,
        severity: args.severity,
        notificationKey: args.notificationKey,
        title: args.title,
        message: args.message,
        actionUrl: args.actionUrl ?? null,
        referenceType: args.referenceType ?? null,
        referenceId: args.referenceId ?? null,
        companyId: args.companyId ?? null,
      },
    });

    if (args.emailImmediate && this.mail?.isConfigured()) {
      await this.emailAdmins({
        title:
          args.severity === PlatformNotificationSeverity.CRITICAL
            ? `[CRITICAL] ${args.title}`
            : args.title,
        message: args.message,
        dedupe: args.emailDedupe,
      }).catch((error) => {
        this.logger.warn(`Platform admin email failed: ${String(error)}`);
      });
    }

    return { notificationId: notification.id };
  }

  async emailAdmins(args: {
    title: string;
    message: string;
    dedupe?: { templateId: string; entityType: string; entityId: string };
  }) {
    const recipients = this.parseAdminEmails();
    if (recipients.length === 0) return { sent: 0 };

    let sent = 0;
    for (const to of recipients) {
      if (args.dedupe) {
        const existing = await this.prisma.emailDeliveryLog.findUnique({
          where: {
            templateId_entityType_entityId_recipient: {
              templateId: args.dedupe.templateId,
              entityType: args.dedupe.entityType,
              entityId: args.dedupe.entityId,
              recipient: to,
            },
          },
        });
        if (existing) continue;
      }

      await this.mail!.sendMail({
        to,
        subject: args.title,
        text: args.message,
        html: `<p>${args.message}</p>`,
        fromName: 'SoftdigitIMS Platform',
      });

      if (args.dedupe) {
        await this.prisma.emailDeliveryLog.create({
          data: {
            templateId: args.dedupe.templateId,
            entityType: args.dedupe.entityType,
            entityId: args.dedupe.entityId,
            recipient: to,
          },
        });
      }
      sent += 1;
    }
    return { sent };
  }

  async listForAdmin(adminEmail: string, opts?: { unreadOnly?: boolean; limit?: number }) {
    const email = adminEmail.toLowerCase();
    const rows = await this.prisma.platformNotification.findMany({
      where: opts?.unreadOnly
        ? { reads: { none: { adminEmail: email } } }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 100,
      include: {
        reads: {
          where: { adminEmail: email },
          select: { readAt: true },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      category: row.category,
      severity: row.severity,
      notificationKey: row.notificationKey,
      title: row.title,
      message: row.message,
      actionUrl: row.actionUrl,
      companyId: row.companyId,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      createdAt: row.createdAt.toISOString(),
      isRead: row.reads.length > 0,
      readAt: row.reads[0]?.readAt?.toISOString() ?? null,
    }));
  }

  async unreadCount(adminEmail: string) {
    const items = await this.listForAdmin(adminEmail, { unreadOnly: true, limit: 200 });
    return { count: items.length };
  }

  async markRead(adminEmail: string, notificationId: string) {
    await this.prisma.platformNotificationRead.upsert({
      where: {
        notificationId_adminEmail: {
          notificationId,
          adminEmail: adminEmail.toLowerCase(),
        },
      },
      create: { notificationId, adminEmail: adminEmail.toLowerCase() },
      update: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(adminEmail: string) {
    const unread = await this.listForAdmin(adminEmail, { unreadOnly: true, limit: 500 });
    if (unread.length === 0) return { updated: 0 };

    await this.prisma.platformNotificationRead.createMany({
      data: unread.map((row) => ({
        notificationId: row.id,
        adminEmail: adminEmail.toLowerCase(),
      })),
      skipDuplicates: true,
    });
    return { updated: unread.length };
  }
}
