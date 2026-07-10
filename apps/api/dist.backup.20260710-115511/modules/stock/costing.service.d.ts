import { CostingMethod, Prisma } from '@prisma/client';
export declare class CostingService {
    recordInflow(tx: Prisma.TransactionClient, args: {
        shopId: string;
        productId: string;
        qty: Prisma.Decimal;
        unitCost: Prisma.Decimal;
        ledgerId?: string;
        grId?: string;
        method: CostingMethod;
    }): Promise<void>;
    recordOutflow(tx: Prisma.TransactionClient, args: {
        shopId: string;
        productId: string;
        qty: Prisma.Decimal;
        method: CostingMethod;
    }): Promise<{
        totalCost: Prisma.Decimal;
        unitCost: Prisma.Decimal;
    }>;
}
