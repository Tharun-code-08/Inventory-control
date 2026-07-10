import { EwayBillStatus, EwaySupplyType, EwaySubType, EwayTransactionType, EwayDocumentType, EwayTransportMode, EwayVehicleType } from '@prisma/client';
export declare class EwayBillItemDto {
    productId?: string;
    productName: string;
    description?: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    taxableAmount: number;
    gstRate: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    cess?: number;
    total: number;
}
export declare class CreateEwayBillDto {
    shopId?: string;
    invoiceId?: string;
    salesOrderId?: string;
    customerId?: string;
    supplyType?: EwaySupplyType;
    subType?: EwaySubType;
    transactionType?: EwayTransactionType;
    documentType?: EwayDocumentType;
    documentNumber: string;
    documentDate: string;
    fromGstin?: string;
    fromName: string;
    fromAddress1?: string;
    fromAddress2?: string;
    fromPlace?: string;
    fromPincode?: string;
    fromStateCode?: string;
    toGstin?: string;
    toName: string;
    toAddress1?: string;
    toAddress2?: string;
    toPlace?: string;
    toPincode?: string;
    toStateCode?: string;
    transporterGstin?: string;
    transporterName?: string;
    transporterId?: string;
    transportMode?: EwayTransportMode;
    transDocNumber?: string;
    transDocDate?: string;
    vehicleNumber?: string;
    vehicleType?: EwayVehicleType;
    distanceKm?: number;
    items?: EwayBillItemDto[];
    remarks?: string;
}
export declare class UpdateEwayBillDto {
    supplyType?: EwaySupplyType;
    subType?: EwaySubType;
    transactionType?: EwayTransactionType;
    documentType?: EwayDocumentType;
    documentNumber?: string;
    documentDate?: string;
    fromGstin?: string;
    fromName?: string;
    fromAddress1?: string;
    fromAddress2?: string;
    fromPlace?: string;
    fromPincode?: string;
    fromStateCode?: string;
    toGstin?: string;
    toName?: string;
    toAddress1?: string;
    toAddress2?: string;
    toPlace?: string;
    toPincode?: string;
    toStateCode?: string;
    transporterGstin?: string;
    transporterName?: string;
    transporterId?: string;
    transportMode?: EwayTransportMode;
    transDocNumber?: string;
    transDocDate?: string;
    vehicleNumber?: string;
    vehicleType?: EwayVehicleType;
    distanceKm?: number;
    items?: EwayBillItemDto[];
    remarks?: string;
}
export declare class GenerateFromInvoiceDto {
    invoiceId: string;
    transportMode?: EwayTransportMode;
    transporterGstin?: string;
    transporterName?: string;
    transDocNumber?: string;
    transDocDate?: string;
    vehicleNumber?: string;
    vehicleType?: EwayVehicleType;
    distanceKm?: number;
}
export declare class CancelEwayBillDto {
    reason: string;
}
export declare class EwayBillFilterDto {
    status?: EwayBillStatus;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
}
