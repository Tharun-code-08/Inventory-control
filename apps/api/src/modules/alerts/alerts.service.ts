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

    const events: Array<{
      alertType: AlertType;
      title: string;
      message: string;
      shopId: string;
      referenceType?: string;
      referenceId?: string;
    }> = [];

    const lowStockRows = await this.prisma.$queryRaw<
      Array<{
        shop_id: string;
        product_id: string;
        product_code: string;
        description: string;
        current_stock: string;
        min_stock_level: string;
      }>
    >`
      SELECT pp.shop_id,
             p.id AS product_id,
             p.product_code,
             p.description,
             COALESCE(s.current_stock, 0)::text AS current_stock,
             pp.min_stock_level::text AS min_stock_level
      FROM product_plants pp
      INNER JOIN products p ON p.id = pp.product_id
      LEFT JOIN stock_summary s
        ON s.shop_id = pp.shop_id
       AND s.product_id = pp.product_id
      WHERE pp.is_active = true
        AND COALESCE(s.current_stock, 0) < pp.min_stock_level
      LIMIT 200
    `;

    const activeLowStockKeys = new Set(
      lowStockRows.map((row) => `${row.shop_id}:${row.product_id}`),
    );

    const openLowStockAlerts = await this.prisma.alertEvent.findMany({
      where: {
        alertType: AlertType.LOW_STOCK,
        resolvedAt: null,
        referenceType: 'PRODUCT',
      },
      select: { id: true, shopId: true, referenceId: true },
      take: 500,
    });

    const openLowStockKeys = new Set(
      openLowStockAlerts
        .filter((alert) => alert.shopId && alert.referenceId)
        .map((alert) => `${alert.shopId}:${alert.referenceId}`),
    );

    const staleAlertIds = openLowStockAlerts
      .filter((alert) => {
        if (!alert.shopId || !alert.referenceId) return false;
        return !activeLowStockKeys.has(`${alert.shopId}:${alert.referenceId}`);
      })
      .map((alert) => alert.id);

    if (staleAlertIds.length > 0) {
      await this.prisma.alertEvent.updateMany({
        where: { id: { in: staleAlertIds } },
        data: { resolvedAt: new Date(), isRead: true },
      });
    }

    for (const row of lowStockRows) {
      const key = `${row.shop_id}:${row.product_id}`;
      if (openLowStockKeys.has(key)) continue;

      const currentStock = Number(row.current_stock ?? '0');
      const minStock = Number(row.min_stock_level ?? '0');
      events.push({
        alertType: AlertType.LOW_STOCK,
        title: `Low stock: ${row.product_code}`,
        message: `${row.description} is below minimum stock level (${currentStock} / ${minStock}).`,
        shopId: row.shop_id,
        referenceType: 'PRODUCT',
        referenceId: row.product_id,
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
          referenceType: evt.referenceType ?? null,
          referenceId: evt.referenceId ?? null,
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

