import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class DocumentNumberService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    yearMonth(d: Date): string;
    nextNumber(tx: Prisma.TransactionClient, params: {
        shopId: string;
        docType: string;
        prefix: string;
        date: Date;
    }): Promise<string>;
}
