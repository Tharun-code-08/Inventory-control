import { BarcodeType } from '@prisma/client';
export declare class CreateBarcodeDto {
    barcodeValue: string;
    barcodeType?: BarcodeType;
    isPrimary?: boolean;
    supplierId?: string;
}
