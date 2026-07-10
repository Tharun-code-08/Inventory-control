import { SupplierReturnReasonCode } from '@prisma/client';
export declare class CreateSupplierReturnItemDto {
    goodsReceiptItemId: string;
    returnQty: number;
    reasonCode: SupplierReturnReasonCode;
}
export declare class CreateSupplierReturnDto {
    shopId?: string;
    returnDate?: string;
    goodsReceiptId: string;
    supplierRef?: string;
    remarks?: string;
    internalCcEmail?: string;
    items: CreateSupplierReturnItemDto[];
}
