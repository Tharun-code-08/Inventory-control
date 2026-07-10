import { BarcodeType, LifecycleStatus } from '@prisma/client';
export declare enum BarcodeOperation {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    REPLACE = "REPLACE",
    DEACTIVATE = "DEACTIVATE",
    LOOKUP = "LOOKUP"
}
export interface BarcodeValidationContext {
    barcodeValue: string;
    companyId: string;
    barcodeType: BarcodeType;
    status?: LifecycleStatus;
    productId?: string;
    operation: BarcodeOperation;
}
