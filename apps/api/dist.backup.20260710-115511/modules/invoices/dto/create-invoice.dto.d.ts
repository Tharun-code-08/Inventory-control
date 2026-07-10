export declare class CreateInvoiceDto {
    invoiceNumber?: string;
    invoiceDate?: string;
    salesOrderId?: string;
    customerId: string;
    shopId?: string;
    totalValue: number;
    dueDate?: string;
    remarks?: string;
    idempotencyKey?: string;
}
