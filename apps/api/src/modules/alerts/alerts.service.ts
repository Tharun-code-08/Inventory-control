import { Injectable } from '@nestjs/common';
import { AlertType, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async runAutomationChecks() {
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
      await this.prisma.alertEvent.createMany({
        data: events.map((evt) => ({
          alertType: evt.alertType,
          title: evt.title,
          message: evt.message,
          shopId: evt.shopId,
          severity: 'HIGH',
        })),
        skipDuplicates: false,
      });
    }

    return { generated: events.length };
  }
}

