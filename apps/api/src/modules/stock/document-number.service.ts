import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentSeriesRestart, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentSeriesService } from '../document-series/document-series.service';

@Injectable()
export class DocumentNumberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly series: DocumentSeriesService,
  ) {}

  /** Embed plant code in the prefix so globally-unique document numbers do not collide across shops. */
  shopScopedPrefix(shopNumber: string, basePrefix: string) {
    return this.series.shopScopedPrefix(shopNumber, basePrefix);
  }

  yearMonth(d: Date) {
    return this.series.sequenceBucket(d, DocumentSeriesRestart.MONTHLY);
  }

  async nextShopScopedNumber(
    tx: Prisma.TransactionClient,
    params: { shopId: string; docType: string; basePrefix: string; date: Date },
  ) {
    return this.nextConfiguredShopScopedNumber(tx, {
      shopId: params.shopId,
      docType: params.docType,
      date: params.date,
    });
  }

  async nextConfiguredShopScopedNumber(
    tx: Prisma.TransactionClient,
    params: { shopId: string; docType: string; date: Date },
  ) {
    const shop = await tx.shop.findUnique({
      where: { id: params.shopId },
      select: { shopNumber: true, companyId: true },
    });
    if (!shop?.companyId) {
      throw new BadRequestException('Invalid shopId');
    }

    const config = await this.series.resolveEffectiveConfigInTx(
      tx,
      shop.companyId,
      params.shopId,
      params.docType,
    );
    const prefix = config.shopScoped
      ? this.shopScopedPrefix(shop.shopNumber, config.prefix)
      : this.series.sanitizePrefix(config.prefix);

    return this.nextNumberWithConfig(tx, {
      shopId: params.shopId,
      docType: params.docType,
      prefix,
      date: params.date,
      config,
    });
  }

  async nextNumber(
    tx: Prisma.TransactionClient,
    params: { shopId: string; docType: string; prefix: string; date: Date },
  ) {
    const shop = await tx.shop.findUnique({
      where: { id: params.shopId },
      select: { companyId: true },
    });
    if (!shop?.companyId) {
      throw new BadRequestException('Invalid shopId');
    }

    const config = await this.series.resolveEffectiveConfigInTx(
      tx,
      shop.companyId,
      params.shopId,
      params.docType,
    );

    return this.nextNumberWithConfig(tx, {
      shopId: params.shopId,
      docType: params.docType,
      prefix: params.prefix || this.series.sanitizePrefix(config.prefix),
      date: params.date,
      config,
    });
  }

  async nextConfiguredNumber(
    tx: Prisma.TransactionClient,
    params: { shopId: string; docType: string; date: Date },
  ) {
    const shop = await tx.shop.findUnique({
      where: { id: params.shopId },
      select: { shopNumber: true, companyId: true },
    });
    if (!shop?.companyId) {
      throw new BadRequestException('Invalid shopId');
    }

    const config = await this.series.resolveEffectiveConfigInTx(
      tx,
      shop.companyId,
      params.shopId,
      params.docType,
    );
    const prefix = config.shopScoped
      ? this.shopScopedPrefix(shop.shopNumber, config.prefix)
      : this.series.sanitizePrefix(config.prefix);

    return this.nextNumberWithConfig(tx, {
      shopId: params.shopId,
      docType: params.docType,
      prefix,
      date: params.date,
      config,
    });
  }

  private async nextNumberWithConfig(
    tx: Prisma.TransactionClient,
    params: {
      shopId: string;
      docType: string;
      prefix: string;
      date: Date;
      config: {
        startingNumber: number;
        padWidth: number;
        restartPeriod: DocumentSeriesRestart;
      };
    },
  ) {
    const bucket = this.series.sequenceBucket(params.date, params.config.restartPeriod);
    const key = `${params.docType}:${params.shopId}:${bucket}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}::text))`;

    const existing = await tx.documentSequence.findUnique({
      where: {
        docType_shopId_yearMonth: {
          docType: params.docType,
          shopId: params.shopId,
          yearMonth: bucket,
        },
      },
    });

    const floor = Math.max(1, params.config.startingNumber);
    const nextSeq = Math.max((existing?.lastSeq ?? floor - 1) + 1, floor);

    await tx.documentSequence.upsert({
      where: {
        docType_shopId_yearMonth: {
          docType: params.docType,
          shopId: params.shopId,
          yearMonth: bucket,
        },
      },
      create: {
        docType: params.docType,
        shopId: params.shopId,
        yearMonth: bucket,
        lastSeq: nextSeq,
      },
      update: { lastSeq: nextSeq },
    });

    const padded = String(nextSeq).padStart(params.config.padWidth, '0');
    if (params.config.restartPeriod === DocumentSeriesRestart.NONE) {
      return `${params.prefix}-${padded}`;
    }
    return `${params.prefix}-${bucket}-${padded}`;
  }
}
