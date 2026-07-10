import { Injectable } from '@nestjs/common';
import { ExceptionRule, ExceptionInput, RuleContext } from '../exception.rule';

/**
 * BLOCKED_LOT exceptions: quality holds — lots blocked for reasons other than
 * expiry (expired lots are surfaced by ExpiryRule instead).
 */
@Injectable()
export class BlockedLotRule extends ExceptionRule {
  name = 'BLOCKED_LOT_RULE';
  type = 'BLOCKED_LOT';

  async evaluate({ tx, companyId }: RuleContext): Promise<ExceptionInput[]> {
    const lots = await tx.inventoryLot.findMany({
      where: {
        companyId,
        status: 'BLOCKED',
        NOT: { blockedReason: 'EXPIRED' },
        qtyOnHand: { gt: 0 },
      },
      include: { product: { select: { productCode: true, description: true } } },
    });

    return lots.map((lot) => ({
      type: 'BLOCKED_LOT' as const,
      severity: 'MEDIUM' as const,
      entityType: 'LOT' as const,
      entityId: lot.id,
      title: `Lot ${lot.lotNumber} of ${lot.product.productCode} is blocked (${lot.blockedReason ?? 'quality hold'})`,
      description: `${lot.qtyOnHand} units on hold${lot.blockedAt ? ` since ${lot.blockedAt.toISOString().slice(0, 10)}` : ''}`,
      metadata: {
        schemaVersion: 1,
        lotNumber: lot.lotNumber,
        productId: lot.productId,
        shopId: lot.shopId,
        blockedReason: lot.blockedReason,
        blockedAt: lot.blockedAt?.toISOString() ?? null,
        qtyOnHand: lot.qtyOnHand.toString(),
      },
    }));
  }
}
