import { Injectable } from '@nestjs/common';
import type { UserChannelLink } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type NotifPrefs = {
  dailySummary?: boolean;
  lowStock?: boolean;
  overduePayment?: boolean;
};

type LinkMetadata = { notifPrefs?: NotifPrefs };

@Injectable()
export class NotificationPrefsService {
  constructor(private readonly prisma: PrismaService) {}

  getPrefs(link: UserChannelLink): NotifPrefs {
    const meta = (link.metadata ?? {}) as LinkMetadata;
    return meta.notifPrefs ?? {};
  }

  isDailySummaryEnabled(link: UserChannelLink): boolean {
    return this.getPrefs(link).dailySummary !== false;
  }

  isLowStockEnabled(link: UserChannelLink): boolean {
    return this.getPrefs(link).lowStock !== false;
  }

  isOverduePaymentEnabled(link: UserChannelLink): boolean {
    return this.getPrefs(link).overduePayment !== false;
  }

  async update(linkId: string, patch: Partial<NotifPrefs>): Promise<void> {
    const link = await this.prisma.userChannelLink.findUnique({
      where: { id: linkId },
      select: { metadata: true },
    });
    const meta = ((link?.metadata ?? {}) as LinkMetadata);
    const merged: NotifPrefs = { ...(meta.notifPrefs ?? {}), ...patch };
    await this.prisma.userChannelLink.update({
      where: { id: linkId },
      data: { metadata: { ...meta, notifPrefs: merged } as object },
    });
  }

  async enableAll(linkId: string): Promise<void> {
    await this.update(linkId, { dailySummary: true, lowStock: true, overduePayment: true });
  }

  async disableAll(linkId: string): Promise<void> {
    await this.update(linkId, { dailySummary: false, lowStock: false, overduePayment: false });
  }
}
