import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentNumberService {
  constructor(private readonly prisma: PrismaService) {}

  /** Embed plant code in the prefix so globally-unique document numbers do not collide across shops. */
  shopScopedPrefix(shopNumber: string, basePrefix: string) {
    const safe = shopNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `${basePrefix}-${safe}`;
  }

  async nextShopScopedNumber(
    tx: Prisma.TransactionClient,
    params: { shopId: string; docType: string; basePrefix: string; date: Date },
  ) {
    const shop = await tx.shop.findUnique({
      where: { id: params.shopId },
      select: { shopNumber: true },
    });
    if (!shop) {
      throw new BadRequestException('Invalid shopId');
    }
    return this.nextNumber(tx, {
      shopId: params.shopId,
      docType: params.docType,
      prefix: this.shopScopedPrefix(shop.shopNumber, params.basePrefix),
      date: params.date,
    });
  }

  yearMonth(d: Date) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  }

  async nextNumber(
    tx: Prisma.TransactionClient,
    params: { shopId: string; docType: string; prefix: string; date: Date },
  ) {
    const ym = this.yearMonth(params.date);
    const key = `${params.docType}:${params.shopId}:${ym}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}::text))`;

    const existing = await tx.documentSequence.findUnique({
      where: {
        docType_shopId_yearMonth: {
          docType: params.docType,
          shopId: params.shopId,
          yearMonth: ym,
        },
      },
    });

    const nextSeq = (existing?.lastSeq ?? 0) + 1;
    await tx.documentSequence.upsert({
      where: {
        docType_shopId_yearMonth: {
          docType: params.docType,
          shopId: params.shopId,
          yearMonth: ym,
        },
      },
      create: {
        docType: params.docType,
        shopId: params.shopId,
        yearMonth: ym,
        lastSeq: nextSeq,
      },
      update: { lastSeq: nextSeq },
    });

    const padded = String(nextSeq).padStart(5, '0');
    return `${params.prefix}-${ym}-${padded}`;
  }
}
