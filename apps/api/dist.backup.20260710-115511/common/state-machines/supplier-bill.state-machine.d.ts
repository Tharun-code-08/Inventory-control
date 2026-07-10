import { SupplierBillStatus } from '@prisma/client';
import { SupplierBillAction } from './document-actions';
export declare const SUPPLIER_BILL_TRANSITIONS: Record<SupplierBillStatus, SupplierBillStatus[]>;
export declare const SUPPLIER_BILL_ACTIONS: Record<SupplierBillAction, SupplierBillStatus[]>;
export declare const SUPPLIER_BILL_REVERSAL_TRANSITIONS: Partial<Record<SupplierBillStatus, SupplierBillStatus[]>>;
