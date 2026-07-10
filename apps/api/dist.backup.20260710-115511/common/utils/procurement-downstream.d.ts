import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
type DbClient = PrismaService | Prisma.TransactionClient;
export declare function getGrDownstreamLinks(db: DbClient, grId: string): Promise<{
    supplierBillCount: number;
    supplierPaymentCount: number;
    supplierReturnCount: number;
    hasFinancialLinks: boolean;
}>;
export declare function assertGrMutationAllowed(db: DbClient, args: {
    grId: string;
    action: 'update' | 'delete' | 'unpost';
}): Promise<void>;
export declare function getSupplierBillDownstreamLinks(db: DbClient, billId: string): Promise<{
    paymentCount: number;
    hasPayments: boolean;
    paidValue: Prisma.Decimal;
}>;
export declare function assertSupplierBillMutationAllowed(db: DbClient, args: {
    billId: string;
    action: 'void' | 'update' | 'delete';
}): Promise<void>;
export declare function grHasOpenBill(db: DbClient, grId: string): Promise<boolean>;
export {};
