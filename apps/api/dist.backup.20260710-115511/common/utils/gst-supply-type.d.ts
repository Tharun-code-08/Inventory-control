import { GstSupplyType } from '@prisma/client';
export declare function gstStateCodeFromTaxId(taxId?: string | null): string | null;
export declare function resolveGstSupplyType(args: {
    shopTaxId?: string | null;
    customerTaxId?: string | null;
}): GstSupplyType;
export declare function isInterStateSupply(supplyType: GstSupplyType): boolean;
