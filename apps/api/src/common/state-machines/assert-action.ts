import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, PurchaseOrderStatus, SupplierBillStatus } from '@prisma/client';
import { GrAction, PurchaseOrderAction, RfqAction, SupplierBillAction } from './document-actions';
import { GR_ACTIONS } from './gr.state-machine';
import { PO_ACTIONS } from './po.state-machine';
import { RFQ_ACTIONS } from './rfq.state-machine';
import { SUPPLIER_BILL_ACTIONS } from './supplier-bill.state-machine';

export function assertPoAction(
  status: PurchaseOrderStatus,
  action: PurchaseOrderAction,
): void {
  const allowed = PO_ACTIONS[action] ?? [];
  if (!allowed.includes(status)) {
    throw new BadRequestException(
      `Purchase order action ${action} is not allowed in status ${status}`,
    );
  }
}

export function assertRfqAction(status: DocumentStatus, action: RfqAction): void {
  const allowed = RFQ_ACTIONS[action] ?? [];
  if (!allowed.includes(status)) {
    throw new BadRequestException(
      `RFQ action ${action} is not allowed in status ${status}`,
    );
  }
}

export function assertGrAction(status: DocumentStatus, action: GrAction): void {
  const allowed = GR_ACTIONS[action] ?? [];
  if (!allowed.includes(status)) {
    throw new BadRequestException(
      `Goods receipt action ${action} is not allowed in status ${status}`,
    );
  }
}

export function assertSupplierBillAction(
  status: SupplierBillStatus,
  action: SupplierBillAction,
): void {
  const allowed = SUPPLIER_BILL_ACTIONS[action] ?? [];
  if (!allowed.includes(status)) {
    throw new BadRequestException(
      `Supplier bill action ${action} is not allowed in status ${status}`,
    );
  }
}

export function assertAction(
  documentType: 'PO',
  status: PurchaseOrderStatus,
  action: PurchaseOrderAction,
): void;
export function assertAction(
  documentType: 'RFQ',
  status: DocumentStatus,
  action: RfqAction,
): void;
export function assertAction(
  documentType: 'PO' | 'RFQ',
  status: PurchaseOrderStatus | DocumentStatus,
  action: PurchaseOrderAction | RfqAction,
): void {
  if (documentType === 'PO') {
    assertPoAction(status as PurchaseOrderStatus, action as PurchaseOrderAction);
    return;
  }
  assertRfqAction(status as DocumentStatus, action as RfqAction);
}
