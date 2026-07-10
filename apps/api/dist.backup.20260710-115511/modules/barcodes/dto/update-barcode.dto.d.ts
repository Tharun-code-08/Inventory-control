import { BarcodeType } from '@prisma/client';
export declare class UpdateBarcodeDto {
    barcodeType?: BarcodeType;
    isPrimary?: boolean;
    supplierId?: string | null;
}
