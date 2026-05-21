import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Read-side helper for currency conversion. Document headers should snapshot
 * the rate at create time (in `fxRateUsed`) so historical totals are stable
 * regardless of future rate movements; this service supplies the snapshot.
 *
 * If `base === quote` we return 1 without hitting the DB. If no rate exists
 * for the requested pair we throw — callers should validate currencies via the
 * `Currency` table first or pre-load fixtures via the seed.
 */
@Injectable()
export class FxRateService {
  constructor(private readonly prisma: PrismaService) {}

  async getRate(
    base: string,
    quote: string,
    asOf: Date = new Date(),
  ): Promise<Prisma.Decimal> {
    if (base === quote) return new Prisma.Decimal(1);
    const direct = await this.prisma.fxRate.findFirst({
      where: { base, quote, asOf: { lte: asOf } },
      orderBy: { asOf: 'desc' },
    });
    if (direct) return new Prisma.Decimal(direct.rate);

    const inverse = await this.prisma.fxRate.findFirst({
      where: { base: quote, quote: base, asOf: { lte: asOf } },
      orderBy: { asOf: 'desc' },
    });
    if (inverse) return new Prisma.Decimal(1).div(inverse.rate);

    throw new NotFoundException(
      `No FX rate found for ${base}->${quote} at or before ${asOf.toISOString()}`,
    );
  }

  async convert(
    amount: Prisma.Decimal | number,
    base: string,
    quote: string,
    asOf: Date = new Date(),
  ): Promise<Prisma.Decimal> {
    const rate = await this.getRate(base, quote, asOf);
    return new Prisma.Decimal(amount).mul(rate);
  }
}
