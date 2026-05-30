import { PurchaseOrderStatus } from '@prisma/client';
import { PurchaseOrderAction } from './document-actions';

/** Allowed persisted status transitions for purchase orders. */
export const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]: [
    PurchaseOrderStatus.CONFIRMED,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.CONFIRMED]: [PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.CANCELLED]: [],
};

/** Statuses in which each business action is permitted. */
export const PO_ACTIONS: Record<PurchaseOrderAction, PurchaseOrderStatus[]> = {
  [PurchaseOrderAction.EDIT]: [PurchaseOrderStatus.DRAFT],
  [PurchaseOrderAction.CONFIRM]: [PurchaseOrderStatus.DRAFT],
  [PurchaseOrderAction.CANCEL]: [
    PurchaseOrderStatus.DRAFT,
    PurchaseOrderStatus.CONFIRMED,
  ],
  [PurchaseOrderAction.SEND]: [PurchaseOrderStatus.CONFIRMED],
};
