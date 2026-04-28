export declare class CreatePaymentDto {
    receiptNumber?: string;
    receiptDate?: string;
    invoiceId: string;
    amount: number;
    method?: string;
    reference?: string;
    remarks?: string;
}
