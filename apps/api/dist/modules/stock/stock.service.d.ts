import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export type PostMovementPayload = {
    type: TransactionType;
    ref: string;
    date: Date;
    shopId: string;
    productId: string;
    inQty: number;
    outQty: number;
    unitRate?: number;
    remarks?: string;
    userId: string;
};
export declare class StockService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    postMovement(tx: Prisma.TransactionClient, payload: PostMovementPayload): Promise<void>;
}
