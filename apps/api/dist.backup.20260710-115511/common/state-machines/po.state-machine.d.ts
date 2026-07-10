import { PurchaseOrderStatus } from '@prisma/client';
import { PurchaseOrderAction } from './document-actions';
export declare const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]>;
export declare const PO_ACTIONS: Record<PurchaseOrderAction, PurchaseOrderStatus[]>;
