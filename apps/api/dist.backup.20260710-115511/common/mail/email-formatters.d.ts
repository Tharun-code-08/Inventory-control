import { Prisma } from '@prisma/client';
export declare function formatEmailDate(value: Date | string | null | undefined): string;
export declare function formatEmailMoney(value: Prisma.Decimal | number, currency?: string): string;
