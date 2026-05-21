import { Injectable } from '@nestjs/common';
import { CostingMethod, Prisma } from '@prisma/client';

/**
 * Stock costing engine. Supports both AVERAGE (weighted-average) and FIFO
 * methods. Layers are written on stock-IN events (goods receipts, returns
 * from customers when returned items go back to stock) and consumed on
 * stock-OUT events (goods issues, sales-order fulfilment, damaged stock,
 * supplier returns).
 *
 * The caller passes a Prisma transaction client; layer reads + writes happen
 * inside the same business transaction so a rollback unwinds the cost layer
 * mutations as well.
 */
@Injectable()
export class CostingService {
  /**
   * Record a stock-IN at `unitCost` and update StockSummary.avgCost using a
   * weighted moving-average:
   *   newAvg = (oldQty * oldAvg + inQty * unitCost) / (oldQty + inQty)
   *
   * For FIFO shops we still update avgCost (used for read-only reporting)
   * AND insert a cost layer for FIFO consumption.
   */
  async recordInflow(
    tx: Prisma.TransactionClient,
    args: {
      shopId: string;
      productId: string;
      qty: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      ledgerId?: string;
      grId?: string;
      method: CostingMethod;
    },
  ): Promise<void> {
    const summary = await tx.stockSummary.findUnique({
      where: { shopId_productId: { shopId: args.shopId, productId: args.productId } },
    });

    const oldQty = summary?.currentStock ?? new Prisma.Decimal(0);
    const oldAvg = summary?.avgCost ?? new Prisma.Decimal(0);
    const totalQty = oldQty.add(args.qty);
    const newAvg = totalQty.gt(0)
      ? oldQty.mul(oldAvg).add(args.qty.mul(args.unitCost)).div(totalQty)
      : args.unitCost;

    if (summary) {
      await tx.stockSummary.update({
        where: { shopId_productId: { shopId: args.shopId, productId: args.productId } },
        data: { avgCost: newAvg },
      });
    } else {
      // The trigger that maintains StockSummary may not have run yet for the
      // very first movement; in that case we skip avg update — the next
      // recordInflow call will catch up. This branch is informational only.
    }

    if (args.method === CostingMethod.FIFO) {
      await tx.costLayer.create({
        data: {
          shopId: args.shopId,
          productId: args.productId,
          grId: args.grId ?? null,
          ledgerId: args.ledgerId ?? null,
          qtyRemaining: args.qty,
          qtyOriginal: args.qty,
          unitCost: args.unitCost,
        },
      });
    }
  }

  /**
   * Record a stock-OUT and return the cost actually consumed. For AVERAGE
   * shops the cost is `qty * StockSummary.avgCost`. For FIFO shops we walk
   * `cost_layers` ordered by createdAt ASC, decrementing qtyRemaining and
   * accumulating cost.
   *
   * Returns the unit-weighted cost (totalCost / qty) so the caller can stamp
   * it on the stock_ledger row's unitRate/value.
   */
  async recordOutflow(
    tx: Prisma.TransactionClient,
    args: {
      shopId: string;
      productId: string;
      qty: Prisma.Decimal;
      method: CostingMethod;
    },
  ): Promise<{ totalCost: Prisma.Decimal; unitCost: Prisma.Decimal }> {
    if (args.qty.lte(0)) {
      return { totalCost: new Prisma.Decimal(0), unitCost: new Prisma.Decimal(0) };
    }

    if (args.method === CostingMethod.AVERAGE) {
      const summary = await tx.stockSummary.findUnique({
        where: { shopId_productId: { shopId: args.shopId, productId: args.productId } },
      });
      const avg = summary?.avgCost ?? new Prisma.Decimal(0);
      return { totalCost: args.qty.mul(avg), unitCost: avg };
    }

    // FIFO: walk layers oldest-first.
    const layers = await tx.costLayer.findMany({
      where: { shopId: args.shopId, productId: args.productId, qtyRemaining: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    });

    let remaining = new Prisma.Decimal(args.qty);
    let totalCost = new Prisma.Decimal(0);

    for (const layer of layers) {
      if (remaining.lte(0)) break;
      const take = Prisma.Decimal.min(remaining, layer.qtyRemaining);
      totalCost = totalCost.add(take.mul(layer.unitCost));
      const newRemaining = layer.qtyRemaining.sub(take);
      await tx.costLayer.update({
        where: { id: layer.id },
        data: { qtyRemaining: newRemaining },
      });
      remaining = remaining.sub(take);
    }

    if (remaining.gt(0)) {
      // Demand exceeded supply on layers — fall back to the running avgCost so
      // the ledger value is non-zero. This should not happen if the trigger's
      // negative-stock guard is in place, but we degrade gracefully.
      const summary = await tx.stockSummary.findUnique({
        where: { shopId_productId: { shopId: args.shopId, productId: args.productId } },
      });
      const avg = summary?.avgCost ?? new Prisma.Decimal(0);
      totalCost = totalCost.add(remaining.mul(avg));
    }

    const unitCost = args.qty.gt(0) ? totalCost.div(args.qty) : new Prisma.Decimal(0);
    return { totalCost, unitCost };
  }
}
