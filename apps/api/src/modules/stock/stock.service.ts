import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type PostMovementPayload = {
  type: TransactionType;
  ref: string;
  date: Date;
  shopId: string;
  productId: string;
  inQty: number;
  outQty: number;
  unitRate?: number;
  remarks?: string;
  userId: string;
};

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async postMovement(tx: Prisma.TransactionClient, payload: PostMovementPayload) {
    const inQty = new Prisma.Decimal(payload.inQty);
    const outQty = new Prisma.Decimal(payload.outQty);
    let value: Prisma.Decimal | null = null;
    if (payload.unitRate !== undefined) {
      const rate = new Prisma.Decimal(payload.unitRate);
      if (payload.inQty > 0) {
        value = rate.mul(inQty);
      } else if (payload.outQty > 0) {
        value = rate.mul(outQty);
      }
    }

    await tx.stockLedger.create({
      data: {
        transactionType: payload.type,
        transactionRef: payload.ref,
        transactionDate: payload.date,
        shopId: payload.shopId,
        productId: payload.productId,
        inQty,
        outQty,
        balanceQty: new Prisma.Decimal(0),
        unitRate: payload.unitRate !== undefined ? new Prisma.Decimal(payload.unitRate) : null,
        value,
        remarks: payload.remarks,
        createdById: payload.userId,
      },
    });
  }
}
