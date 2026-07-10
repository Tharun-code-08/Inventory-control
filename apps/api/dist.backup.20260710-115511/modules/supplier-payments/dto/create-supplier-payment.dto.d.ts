export declare class CreateSupplierPaymentDto {
    paymentNumber?: string;
    paymentDate?: string;
    supplierBillId: string;
    amount: number;
    method?: string;
    reference?: string;
    remarks?: string;
    idempotencyKey?: string;
}
