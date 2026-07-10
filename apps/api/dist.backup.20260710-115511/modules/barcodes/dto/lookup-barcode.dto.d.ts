import { ScanAction, ScanSource } from '@prisma/client';
export declare class LookupBarcodeDto {
    code: string;
    action?: ScanAction;
    shopId?: string;
    source?: ScanSource;
}
