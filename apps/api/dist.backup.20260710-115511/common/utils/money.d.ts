import { Prisma } from '@prisma/client';
export declare function asMoney(value: Prisma.Decimal | string | number): Prisma.Decimal;
export declare function assertPositiveMoney(value: Prisma.Decimal, fieldName: string): void;
export declare function assertNonNegativeMoney(value: Prisma.Decimal, fieldName: string): void;
export declare function roundMoney(value: Prisma.Decimal): Prisma.Decimal;
