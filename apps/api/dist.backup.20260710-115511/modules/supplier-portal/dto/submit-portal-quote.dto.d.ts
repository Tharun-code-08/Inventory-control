export declare class PortalQuoteLineDto {
    rfqItemId: string;
    unitPrice: number;
}
export declare class SubmitPortalQuoteDto {
    rfqId: string;
    supplierId: string;
    leadTimeDays?: number;
    notes?: string;
    items: PortalQuoteLineDto[];
}
