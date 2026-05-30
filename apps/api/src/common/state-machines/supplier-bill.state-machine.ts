import { SupplierBillStatus } from '@prisma/client';
import { SupplierBillAction } from './document-actions';

/** Allowed persisted status transitions for supplier bills. */
export const SUPPLIER_BILL_TRANSITIONS: Record<SupplierBillStatus, SupplierBillStatus[]> = {
  [SupplierBillStatus.DRAFT]: [SupplierBillStatus.ISSUED],
  [SupplierBillStatus.ISSUED]: [
    SupplierBillStatus.PARTIALLY_PAID,
    SupplierBillStatus.PAID,
    SupplierBillStatus.VOID,
  ],
  [SupplierBillStatus.PARTIALLY_PAID]: [SupplierBillStatus.PAID, SupplierBillStatus.VOID],
  [SupplierBillStatus.PAID]: [],
  [SupplierBillStatus.VOID]: [],
};

/** Statuses in which each business action is permitted. */
export const SUPPLIER_BILL_ACTIONS: Record<SupplierBillAction, SupplierBillStatus[]> = {
  [SupplierBillAction.SEND]: [
    SupplierBillStatus.ISSUED,
    SupplierBillStatus.PARTIALLY_PAID,
    SupplierBillStatus.PAID,
  ],
  [SupplierBillAction.RECORD_PAYMENT]: [
    SupplierBillStatus.ISSUED,
    SupplierBillStatus.PARTIALLY_PAID,
  ],
  [SupplierBillAction.VOID]: [SupplierBillStatus.ISSUED],
};

/** Backward transitions allowed when reversing supplier payments. */
export const SUPPLIER_BILL_REVERSAL_TRANSITIONS: Partial<
  Record<SupplierBillStatus, SupplierBillStatus[]>
> = {
  [SupplierBillStatus.PAID]: [SupplierBillStatus.PARTIALLY_PAID, SupplierBillStatus.ISSUED],
  [SupplierBillStatus.PARTIALLY_PAID]: [SupplierBillStatus.ISSUED],
};
