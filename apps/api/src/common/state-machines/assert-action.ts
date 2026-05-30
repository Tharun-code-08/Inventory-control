import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, PurchaseOrderStatus } from '@prisma/client';
import { PurchaseOrderAction, RfqAction } from './document-actions';
import { PO_ACTIONS } from './po.state-machine';
import { RFQ_ACTIONS } from './rfq.state-machine';

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
