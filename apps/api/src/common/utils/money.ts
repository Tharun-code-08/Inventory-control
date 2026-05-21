import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function asMoney(value: Prisma.Decimal | string | number) {
  return new Prisma.Decimal(value);
}

export function assertPositiveMoney(value: Prisma.Decimal, fieldName: string) {
  if (value.lte(0)) {
    throw new BadRequestException(`${fieldName} must be greater than zero`);
  }
}

export function assertNonNegativeMoney(value: Prisma.Decimal, fieldName: string) {
  if (value.lt(0)) {
    throw new BadRequestException(`${fieldName} cannot be negative`);
  }
}

export function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

