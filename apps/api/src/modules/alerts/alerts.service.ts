import { Injectable, Optional } from '@nestjs/common';
import { AlertType, PurchaseOrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
import { getIdempotentResult, setIdempotentResult } from '../../common/utils/idempotency';
import { NotificationsService } from '../notifications/notifications.service';

const CONFIG_KEY_PREFIX = 'notifications_matrix_config_v1';

const defaultNotificationConfig = {
  version: '1.0',
  groups: [
    {
      id: 'procurement',
      title: 'Procurement',
      moduleTags: ['RFQs', 'Quotations', 'Contracts', 'Purchase Orders'],
      rules: [
        {
          id: 'rfq_submitted',
          title: 'New RFQ submitted and awaiting supplier responses',
          notifyTo: 'Purchase Manager',
          severity: 'ACTION',
          channels: ['Email', 'In-app'],
        },
        {
          id: 'rfq_deadline',
          title: 'RFQ response deadline approaching (24 hrs)',
          notifyTo: 'Procurement Team',
          severity: 'WARNING',
          channels: ['Email', 'In-app'],
        },
        {
          id: 'po_pending_approval',
          title: 'New PO pending approval (above threshold)',
          notifyTo: 'Finance Head, Management',
          severity: 'ACTION',
          channels: ['Email', 'In-app'],
        },
      ],
    },
    {
      id: 'inventory_warehouse',
      title: 'Inventory & Warehouse',
      moduleTags: ['Products', 'Goods Receipt', 'Goods Issue', 'Warehouse'],
      rules: [
        {
          id: 'low_stock',
          title: 'Low stock threshold breached',
          notifyTo: 'Store Keeper, Inventory Manager',
          severity: 'URGENT',
          channels: ['In-app', 'Email', 'WhatsApp'],
        },
      ],
    },
    {
      id: 'finance',
      title: 'Finance',
      moduleTags: ['Invoices', 'Payments'],
      rules: [
        {
          id: 'invoice_overdue',
          title: 'Invoice overdue for collection',
          notifyTo: 'Accounts Team',
          severity: 'WARNING',
          channels: ['Email'],
        },
      ],
    },
  ],
};

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications: NotificationsService | null = null,
  ) {}

  private configKey(shopId?: string | null) {
    return `${CONFIG_KEY_PREFIX}:${shopId ?? 'global'}`;
  }

  async list(user: RequestUser) {
    return this.prisma.alertEvent.findMany({
      where: user.shopId ? { shopId: user.shopId } : undefined,
      orderBy: { triggeredAt: 'desc' },
      take: 100,
    });
  }

  async markRead(user: RequestUser, id: string) {
    return this.prisma.alertEvent.update({
      where: { id },
      data: { isRead: true, resolvedAt: new Date() },
    });
  }

  async getNotificationConfig(user: RequestUser) {
    const key = this.configKey(user.shopId);
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) {
      return defaultNotificationConfig;
    }
    return setting.value;
  }

  async updateNotificationConfig(user: RequestUser, dto: UpdateNotificationConfigDto) {
    const key = this.configKey(user.shopId);
    const value = {
      version: dto.version ?? '1.0',
      groups: dto.groups.map((group) => ({
        id: group.id,
        title: group.title,
        moduleTags: [...group.moduleTags],
        rules: group.rules.map((rule) => ({
          id: rule.id,
          title: rule.title,
          notifyTo: rule.notifyTo,
          severity: rule.severity,
          channels: [...rule.channels],
        })),
      })),
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    } as Prisma.InputJsonValue;
    const saved = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, updatedById: user.id },
      create: { key, value, createdById: user.id, updatedById: user.id },
    });
    return saved.value;
  }

  async runAutomationChecks() {
    const idempotencyKey = `alerts:automation:${new Date().toISOString().slice(0, 13)}`;
    const already = await this.prisma.$transaction((tx) =>
      getIdempotentResult<{ generated: number }>(tx, idempotencyKey),
    );
    if (already) return already;

    const events: Array<{ alertType: AlertType; title: string; message: string; shopId: string }> = [];

    const lowStock = await this.prisma.stockSummary.findMany({
      where: { currentStock: { lt: 1 } },
      include: { product: true },
      take: 200,
    });
    for (const row of lowStock) {
      events.push({
        alertType: AlertType.LOW_STOCK,
        title: `Low stock: ${row.product.productCode}`,
        message: `${row.product.description} is below minimum stock level.`,
        shopId: row.shopId,
      });
    }

    const expiringContracts = await this.prisma.contractHeader.findMany({
      where: {
        endDate: {
          lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          gte: new Date(),
        },
      },
      take: 200,
    });
    for (const row of expiringContracts) {
      events.push({
        alertType: AlertType.CONTRACT_EXPIRY,
        title: `Contract expiring: ${row.contractNumber}`,
        message: `Contract ${row.title} is expiring soon.`,
        shopId: row.shopId,
      });
    }

    const overduePo = await this.prisma.purchaseOrderHeader.findMany({
      where: {
        status: { in: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CONFIRMED] },
        poDate: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
      },
      take: 200,
    });
    for (const row of overduePo) {
      events.push({
        alertType: AlertType.PO_OVERDUE,
        title: `PO overdue: ${row.poNumber}`,
        message: `Purchase order is pending beyond expected timeline.`,
        shopId: row.shopId,
      });
    }

    if (events.length > 0) {
      // Use createManyAndReturn so we have the ids to enqueue notifications.
      const created = await this.prisma.alertEvent.createManyAndReturn({
        data: events.map((evt) => ({
          alertType: evt.alertType,
          title: evt.title,
          message: evt.message,
          shopId: evt.shopId,
          severity: 'HIGH',
        })),
        skipDuplicates: false,
      });
      if (this.notifications) {
        await Promise.all(
          created.map((row) =>
            this.notifications!.enqueue({
              alertEventId: row.id,
              alertType: String(row.alertType),
              title: row.title,
              message: row.message,
              shopId: row.shopId,
              severity: row.severity,
            }).catch(() => {
              // Enqueue failures must not roll back alert creation; the
              // automation job is itself idempotent and will re-enqueue on
              // the next tick if Redis was momentarily unavailable.
            }),
          ),
        );
      }
    }

    const result = { generated: events.length };
    await this.prisma.$transaction((tx) => setIdempotentResult(tx, idempotencyKey, result));
    return result;
  }

  async runRetention(daysToKeep = 90) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const deleted = await this.prisma.alertEvent.deleteMany({
      where: {
        isRead: true,
        triggeredAt: { lt: cutoff },
      },
    });
    return {
      daysToKeep,
      cutoff: cutoff.toISOString(),
      deleted: deleted.count,
    };
  }
}

