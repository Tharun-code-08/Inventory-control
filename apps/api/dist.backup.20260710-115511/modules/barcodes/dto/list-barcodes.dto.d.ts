import { BarcodeType } from '@prisma/client';
export declare class ListBarcodesDto {
    search?: string;
    barcodeType?: BarcodeType;
    supplierId?: string;
    page?: number;
    limit?: number;
}
