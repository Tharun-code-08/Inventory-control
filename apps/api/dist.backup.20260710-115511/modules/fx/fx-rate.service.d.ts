import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class FxRateService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRate(base: string, quote: string, asOf?: Date): Promise<Prisma.Decimal>;
    convert(amount: Prisma.Decimal | number, base: string, quote: string, asOf?: Date): Promise<Prisma.Decimal>;
}
