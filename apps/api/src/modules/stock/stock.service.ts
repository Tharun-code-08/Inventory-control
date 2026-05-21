import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type PostMovementPayload = {
  type: TransactionType;
  ref: string;
  date: Date;
  shopId: string;
  productId: string;
  inQty: number | Prisma.Decimal;
  outQty: number | Prisma.Decimal;
  unitRate?: number | Prisma.Decimal;
  remarks?: string;
  userId: string;
  sourceType?: string;
  sourceId?: string;
  sourceLineId?: string;
  idempotencyKey?: string;
};

function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  private buildRemarks(payload: PostMovementPayload) {
    const audit = {
      sourceType: payload.sourceType ?? payload.type,
      sourceId: payload.sourceId ?? payload.ref,
      sourceLineId: payload.sourceLineId ?? null,
    };
    const existing = payload.remarks?.trim();
    return existing ? `${existing} | ${JSON.stringify(audit)}` : JSON.stringify(audit);
  }

  /**
   * Insert a stock-ledger row. Negative-stock prevention, balance computation,
   * and stock_summary upsert are handled by DB triggers (with a per-(shop,product)
   * advisory lock) so this method is safe under concurrent calls.
   */
  async postMovement(tx: Prisma.TransactionClient, payload: PostMovementPayload) {
    const inQty = new Prisma.Decimal(payload.inQty);
    const outQty = new Prisma.Decimal(payload.outQty);
    let value: Prisma.Decimal | null = null;
    let unitRate: Prisma.Decimal | null = null;
    if (payload.unitRate !== undefined) {
      unitRate = new Prisma.Decimal(payload.unitRate);
      if (inQty.gt(0)) {
        value = unitRate.mul(inQty);
      } else if (outQty.gt(0)) {
        value = unitRate.mul(outQty);
      }
    }

    return tx.stockLedger.create({
      data: {
        transactionType: payload.type,
        transactionRef: payload.ref,
        transactionDate: payload.date,
        shopId: payload.shopId,
        productId: payload.productId,
        inQty,
        outQty,
        // The AFTER INSERT trigger overwrites this with the running balance.
        balanceQty: new Prisma.Decimal(0),
        unitRate,
        value,
        remarks: this.buildRemarks(payload),
        idempotencyKey: payload.idempotencyKey ?? null,
        createdById: payload.userId,
      },
    });
  }

  /**
   * Idempotent posting: if a ledger row with the same idempotencyKey already
   * exists, returns it instead of inserting a duplicate. Relies on the unique
   * index on stock_ledger.idempotency_key, so concurrent calls cannot both win.
   */
  async postMovementOnce(tx: Prisma.TransactionClient, payload: PostMovementPayload) {
    const key =
      payload.idempotencyKey ??
      `${payload.type}:${payload.ref}:${payload.productId}:${String(payload.inQty)}:${String(payload.outQty)}`;

    try {
      return await this.postMovement(tx, { ...payload, idempotencyKey: key });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const existing = await tx.stockLedger.findUnique({ where: { idempotencyKey: key } });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async reconcile(shopId?: string) {
    const rows = await this.prisma.stockSummary.findMany({
      where: shopId ? { shopId } : undefined,
      include: { product: true },
      take: 2000,
    });

    const ledgerSums = await this.prisma.stockLedger.groupBy({
      by: ['shopId', 'productId'],
      where: shopId ? { shopId } : undefined,
      _sum: { inQty: true, outQty: true },
    });
    const ledgerMap = new Map<string, Prisma.Decimal>();
    for (const sum of ledgerSums) {
      const key = `${sum.shopId}:${sum.productId}`;
      const inQty = sum._sum.inQty ?? new Prisma.Decimal(0);
      const outQty = sum._sum.outQty ?? new Prisma.Decimal(0);
      ledgerMap.set(key, inQty.sub(outQty));
    }

    const discrepancies: Array<{
      shopId: string;
      productId: string;
      productCode: string;
      summaryQty: string;
      ledgerQty: string;
      delta: string;
    }> = [];

    for (const row of rows) {
      const ledgerQty = ledgerMap.get(`${row.shopId}:${row.productId}`) ?? new Prisma.Decimal(0);
      const delta = new Prisma.Decimal(row.currentStock).sub(ledgerQty);
      if (!delta.eq(0)) {
        discrepancies.push({
          shopId: row.shopId,
          productId: row.productId,
          productCode: row.product.productCode,
          summaryQty: row.currentStock.toString(),
          ledgerQty: ledgerQty.toString(),
          delta: delta.toString(),
        });
      }
    }

    return {
      checked: rows.length,
      discrepanciesCount: discrepancies.length,
      discrepancies,
    };
  }
}
