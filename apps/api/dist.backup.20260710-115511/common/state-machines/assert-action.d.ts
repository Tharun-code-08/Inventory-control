import { DocumentStatus, PurchaseOrderStatus, SupplierBillStatus } from '@prisma/client';
import { GrAction, PurchaseOrderAction, RfqAction, SupplierBillAction } from './document-actions';
export declare function assertPoAction(status: PurchaseOrderStatus, action: PurchaseOrderAction): void;
export declare function assertRfqAction(status: DocumentStatus, action: RfqAction): void;
export declare function assertGrAction(status: DocumentStatus, action: GrAction): void;
export declare function assertSupplierBillAction(status: SupplierBillStatus, action: SupplierBillAction): void;
export declare function assertAction(documentType: 'PO', status: PurchaseOrderStatus, action: PurchaseOrderAction): void;
export declare function assertAction(documentType: 'RFQ', status: DocumentStatus, action: RfqAction): void;
