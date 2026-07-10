import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../../common/event-platform/outbox.service';
import { ExceptionEngineService } from './exception-engine/exception-engine.service';
import { EXPIRY_SCAN_QUEUE, DEFAULT_EXPIRY_THRESHOLDS } from './expiry-scan.constants';

@Processor(EXPIRY_SCAN_QUEUE)
export class ExpiryScanProcessor extends WorkerHost {
  private readonly logger = new Logger(ExpiryScanProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly exceptionEngine: ExceptionEngineService,
  ) {
    super();
  }

  async process(_job: Job) {
    const thresholds = DEFAULT_EXPIRY_THRESHOLDS;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all companies with inventory lots
    const companies = await this.prisma.$queryRaw<Array<{ company_id: string }>>`
      SELECT DISTINCT company_id FROM inventory_lots WHERE company_id IS NOT NULL
    `;

    for (const { company_id: companyId } of companies) {
      try {
        await this.scanCompanyExpiry(companyId, thresholds, today);
        // Refresh the Inventory Health exception feed for this company
        await this.prisma.$transaction((tx) =>
          this.exceptionEngine.executeAllRules(tx, companyId),
        );
      } catch (err) {
        this.logger.error(
          `Error scanning expiry for company ${companyId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { companies: companies.length, scanned: true };
  }

  private async scanCompanyExpiry(companyId: string, thresholds: number[], today: Date): Promise<void> {
    // 1. Auto-block expired lots
    const expiredLots = await this.prisma.inventoryLot.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        qtyOnHand: { gt: 0 },
        expiryDate: { lt: today },
      },
      select: { id: true },
    });

    for (const lot of expiredLots) {
      await this.prisma.inventoryLot.update({
        where: { id: lot.id },
        data: {
          status: 'BLOCKED',
          blockedReason: 'EXPIRED',
          blockedAt: new Date(),
        },
      });

      // Emit expired event
      await this.prisma.$transaction(async (tx) => {
        await this.outbox.emit(tx, {
          eventType: 'inventory-lot.expired',
          eventVersion: 1,
          aggregateType: 'InventoryLot',
          aggregateId: lot.id,
          companyId,
          payload: { lotId: lot.id, threshold: 0 },
        });

        // Record alert to prevent re-emission
        await tx.inventoryLotAlert.upsert({
          where: { lotId_threshold: { lotId: lot.id, threshold: 0 } },
          create: { lotId: lot.id, threshold: 0, eventId: lot.id },
          update: {},
        });
      });
    }

    // 2. Check threshold crossings
    for (const thresh of thresholds) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + thresh);

      const lots = await this.prisma.inventoryLot.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          qtyOnHand: { gt: 0 },
          expiryDate: { gte: today, lte: targetDate },
        },
        include: { product: { select: { productCode: true, description: true } }, shop: { select: { id: true } } },
      });

      for (const lot of lots) {
        await this.prisma.$transaction(async (tx) => {
          // Check if alert already exists
          const existing = await tx.inventoryLotAlert.findUnique({
            where: { lotId_threshold: { lotId: lot.id, threshold: thresh } },
          });

          if (!existing) {
            const daysLeft = Math.floor((lot.expiryDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const eventType = thresh === 1 ? 'inventory-lot.expiring-critical' : 'inventory-lot.expiring';

            await this.outbox.emit(tx, {
              eventType,
              eventVersion: 1,
              aggregateType: 'InventoryLot',
              aggregateId: lot.id,
              companyId,
              payload: {
                lotId: lot.id,
                lotNumber: lot.lotNumber,
                productId: lot.productId,
                productName: lot.product.description,
                shopId: lot.shopId,
                expiryDate: lot.expiryDate?.toISOString().slice(0, 10),
                daysLeft,
                qtyOnHand: lot.qtyOnHand.toString(),
                unitCost: lot.unitCost?.toString(),
                threshold: thresh,
              },
            });

            // Record alert to prevent re-emission
            await tx.inventoryLotAlert.create({
              data: { lotId: lot.id, threshold: thresh, eventId: lot.id },
            });
          }
        });
      }
    }
  }
}
