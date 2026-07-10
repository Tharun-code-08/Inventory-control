import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentSeriesService } from '../document-series/document-series.service';
export declare class DocumentNumberService {
    private readonly prisma;
    private readonly series;
    constructor(prisma: PrismaService, series: DocumentSeriesService);
    shopScopedPrefix(shopNumber: string, basePrefix: string): string;
    yearMonth(d: Date): string;
    nextShopScopedNumber(tx: Prisma.TransactionClient, params: {
        shopId: string;
        docType: string;
        basePrefix: string;
        date: Date;
    }): Promise<string>;
    nextConfiguredShopScopedNumber(tx: Prisma.TransactionClient, params: {
        shopId: string;
        docType: string;
        date: Date;
    }): Promise<string>;
    nextNumber(tx: Prisma.TransactionClient, params: {
        shopId: string;
        docType: string;
        prefix: string;
        date: Date;
    }): Promise<string>;
    nextConfiguredNumber(tx: Prisma.TransactionClient, params: {
        shopId: string;
        docType: string;
        date: Date;
    }): Promise<string>;
    private nextNumberWithConfig;
}
