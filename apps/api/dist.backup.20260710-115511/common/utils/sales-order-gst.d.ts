import { GstSupplyType, Prisma } from '@prisma/client';
export declare const VALID_GST_SLABS: readonly [0, 5, 12, 18, 28];
export type SalesOrderLineGstInput = {
    quantity?: number;
    unitPrice?: number;
    discountAmount?: number;
    cgstRate?: number;
    sgstRate?: number;
    igstRate?: number;
    taxRate?: number;
    supplyType?: GstSupplyType;
};
export declare function validateGstSlab(cgstPercent: number, sgstPercent: number): void;
export declare function validateIgstSlab(igstPercent: number): void;
export declare function resolveLineGstPercents(item: SalesOrderLineGstInput, supplyType?: GstSupplyType): {
    cgstPercent: number;
    sgstPercent: number;
    igstPercent: number;
};
export declare function computeSalesOrderLineTotals(item: SalesOrderLineGstInput, supplyType?: GstSupplyType): {
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    cgstRate: Prisma.Decimal;
    sgstRate: Prisma.Decimal;
    igstRate: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    cgstAmount: Prisma.Decimal;
    sgstAmount: Prisma.Decimal;
    igstAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    lineValue: Prisma.Decimal;
    taxable: Prisma.Decimal;
};
export declare function productGstRateToLinePercents(gstRatePercent: number, supplyType: GstSupplyType): {
    cgstPercent: number;
    sgstPercent: number;
    igstPercent: number;
};
