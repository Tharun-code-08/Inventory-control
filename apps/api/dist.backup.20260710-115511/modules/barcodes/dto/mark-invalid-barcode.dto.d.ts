import { ScanAction, ScanSource } from '@prisma/client';
export declare class MarkInvalidBarcodeDto {
    code: string;
    action?: ScanAction;
    shopId?: string;
    source?: ScanSource;
}
