import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export type PostMovementPayload = {
    type: TransactionType;
    ref: string;
    date: Date;
    shopId: string;
    productId: string;
    inQty: number | Prisma.Decimal;
    outQty: number | Prisma.Decimal;
    unitRate?: number | Prisma.Decimal;
    remarks?: string;
    userId: string;
    sourceType?: string;
    sourceId?: string;
    sourceLineId?: string;
    idempotencyKey?: string;
};
export declare class StockService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private buildRemarks;
    postMovement(tx: Prisma.TransactionClient, payload: PostMovementPayload): Promise<{
        shopId: string;
        idempotencyKey: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        productId: string;
        remarks: string | null;
        value: Prisma.Decimal | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        transactionRef: string;
        transactionDate: Date;
        inQty: Prisma.Decimal;
        outQty: Prisma.Decimal;
        balanceQty: Prisma.Decimal;
        unitRate: Prisma.Decimal | null;
    }>;
    postMovementOnce(tx: Prisma.TransactionClient, payload: PostMovementPayload): Promise<{
        shopId: string;
        idempotencyKey: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        productId: string;
        remarks: string | null;
        value: Prisma.Decimal | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        transactionRef: string;
        transactionDate: Date;
        inQty: Prisma.Decimal;
        outQty: Prisma.Decimal;
        balanceQty: Prisma.Decimal;
        unitRate: Prisma.Decimal | null;
    }>;
    buildStockBalanceMap(tx: Prisma.TransactionClient | PrismaService, productIds: string[], shopIds?: string[]): Promise<Map<string, number>>;
    resolveBalance(tx: Prisma.TransactionClient | PrismaService, shopId: string, productId: string): Promise<Prisma.Decimal>;
    reconcile(shopId?: string): Promise<{
        checked: number;
        discrepanciesCount: number;
        discrepancies: {
            shopId: string;
            productId: string;
            productCode: string;
            summaryQty: string;
            ledgerQty: string;
            delta: string;
        }[];
    }>;
}
