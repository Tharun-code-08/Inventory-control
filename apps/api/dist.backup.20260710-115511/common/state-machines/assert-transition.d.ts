import { DocumentStatus, PurchaseOrderStatus, SupplierBillStatus } from '@prisma/client';
export type DocumentType = 'PO' | 'RFQ' | 'GR' | 'SUPPLIER_BILL';
export declare function assertPoTransition(fromStatus: PurchaseOrderStatus, toStatus: PurchaseOrderStatus): void;
export declare function assertRfqTransition(fromStatus: DocumentStatus, toStatus: DocumentStatus): void;
export declare function assertGrTransition(fromStatus: DocumentStatus, toStatus: DocumentStatus): void;
export declare function assertSupplierBillTransition(fromStatus: SupplierBillStatus, toStatus: SupplierBillStatus): void;
export declare function assertSupplierBillReversalTransition(fromStatus: SupplierBillStatus, toStatus: SupplierBillStatus): void;
export declare function assertTransition(documentType: DocumentType, fromStatus: PurchaseOrderStatus | DocumentStatus, toStatus: PurchaseOrderStatus | DocumentStatus): void;
