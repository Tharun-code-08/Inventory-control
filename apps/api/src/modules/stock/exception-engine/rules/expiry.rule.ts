import { Injectable } from '@nestjs/common';
import { ExceptionRule, ExceptionInput, RuleContext } from '../exception.rule';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * EXPIRY exceptions: one per lot that is expired (blocked) or expiring within
 * 7 days. Severity encodes urgency; daysRemaining lives in metadata.
 */
@Injectable()
export class ExpiryRule extends ExceptionRule {
  name = 'EXPIRY_RULE';
  type = 'EXPIRY';

  async evaluate({ tx, companyId }: RuleContext): Promise<ExceptionInput[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 7);

    const [expiring, expired] = await Promise.all([
      tx.inventoryLot.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          qtyOnHand: { gt: 0 },
          expiryDate: { gte: today, lte: horizon },
        },
        include: { product: { select: { productCode: true, description: true } } },
      }),
      tx.inventoryLot.findMany({
        where: {
          companyId,
          status: 'BLOCKED',
          blockedReason: 'EXPIRED',
          qtyOnHand: { gt: 0 },
        },
        include: { product: { select: { productCode: true, description: true } } },
      }),
    ]);

    const results: ExceptionInput[] = [];

    for (const lot of expiring) {
      if (!lot.expiryDate) continue;
      const daysRemaining = Math.floor((lot.expiryDate.getTime() - today.getTime()) / MS_PER_DAY);
      const severity = daysRemaining <= 1 ? 'CRITICAL' : daysRemaining <= 3 ? 'HIGH' : 'MEDIUM';
      results.push({
        type: 'EXPIRY',
        severity,
        entityType: 'LOT',
        entityId: lot.id,
        title: `Lot ${lot.lotNumber} of ${lot.product.productCode} expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
        description: `${lot.product.description ?? lot.product.productCode} — ${lot.qtyOnHand} on hand, expiry ${lot.expiryDate.toISOString().slice(0, 10)}`,
        metadata: {
          schemaVersion: 1,
          daysRemaining,
          lotNumber: lot.lotNumber,
          productId: lot.productId,
          shopId: lot.shopId,
          qtyOnHand: lot.qtyOnHand.toString(),
          expiryDate: lot.expiryDate.toISOString().slice(0, 10),
        },
      });
    }

    for (const lot of expired) {
      results.push({
        type: 'EXPIRY',
        severity: 'CRITICAL',
        entityType: 'LOT',
        entityId: lot.id,
        title: `Lot ${lot.lotNumber} of ${lot.product.productCode} has expired`,
        description: `${lot.product.description ?? lot.product.productCode} — ${lot.qtyOnHand} blocked units awaiting scrap or expiry extension`,
        metadata: {
          schemaVersion: 1,
          daysRemaining: lot.expiryDate
            ? Math.floor((lot.expiryDate.getTime() - today.getTime()) / MS_PER_DAY)
            : null,
          expired: true,
          lotNumber: lot.lotNumber,
          productId: lot.productId,
          shopId: lot.shopId,
          qtyOnHand: lot.qtyOnHand.toString(),
          expiryDate: lot.expiryDate?.toISOString().slice(0, 10) ?? null,
        },
      });
    }

    return results;
  }
}
