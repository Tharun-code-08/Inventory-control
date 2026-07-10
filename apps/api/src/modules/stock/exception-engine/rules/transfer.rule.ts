import { Injectable } from '@nestjs/common';
import { ExceptionRule, ExceptionInput, RuleContext } from '../exception.rule';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * TRANSFER exceptions:
 * - DISPATCHED transfers awaiting receipt (stock is in transit).
 * - DRAFT transfers older than 2 days that were never dispatched/posted.
 */
@Injectable()
export class TransferRule extends ExceptionRule {
  name = 'TRANSFER_RULE';
  type = 'TRANSFER';

  async evaluate({ tx, companyId }: RuleContext): Promise<ExceptionInput[]> {
    const now = Date.now();
    const staleDraftBefore = new Date(now - 2 * MS_PER_DAY);

    const transfers = await tx.stockTransferHeader.findMany({
      where: {
        fromShop: { companyId },
        OR: [
          { status: 'DISPATCHED' },
          { status: 'DRAFT', createdAt: { lt: staleDraftBefore } },
        ],
      },
      include: {
        fromShop: { select: { shopName: true } },
        toShop: { select: { shopName: true } },
      },
    });

    return transfers.map((t) => {
      const pendingReceipt = t.status === 'DISPATCHED';
      const referenceDate = pendingReceipt ? (t.dispatchedAt ?? t.createdAt) : t.createdAt;
      const ageDays = Math.floor((now - referenceDate.getTime()) / MS_PER_DAY);
      const severity = pendingReceipt
        ? ageDays >= 3
          ? 'HIGH'
          : 'MEDIUM'
        : ageDays >= 7
          ? 'MEDIUM'
          : 'LOW';

      return {
        type: 'TRANSFER' as const,
        severity,
        entityType: 'TRANSFER' as const,
        entityId: t.id,
        title: pendingReceipt
          ? `Transfer ${t.transferNumber} awaiting receipt at ${t.toShop.shopName} (${ageDays}d in transit)`
          : `Transfer ${t.transferNumber} still in draft after ${ageDays}d`,
        description: `${t.fromShop.shopName} → ${t.toShop.shopName}`,
        metadata: {
          schemaVersion: 1,
          transferNumber: t.transferNumber,
          status: t.status,
          fromShopId: t.fromShopId,
          toShopId: t.toShopId,
          ageDays,
          pendingReceipt,
        },
      };
    });
  }
}
