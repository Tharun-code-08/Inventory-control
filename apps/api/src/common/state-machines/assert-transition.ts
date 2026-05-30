import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, PurchaseOrderStatus } from '@prisma/client';
import { PO_TRANSITIONS } from './po.state-machine';
import { RFQ_TRANSITIONS } from './rfq.state-machine';

export type DocumentType = 'PO' | 'RFQ';

export function assertPoTransition(
  fromStatus: PurchaseOrderStatus,
  toStatus: PurchaseOrderStatus,
): void {
  if (fromStatus === toStatus) return;
  const allowed = PO_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new BadRequestException(
      `Invalid purchase order status transition: ${fromStatus} -> ${toStatus}`,
    );
  }
}

export function assertRfqTransition(fromStatus: DocumentStatus, toStatus: DocumentStatus): void {
  if (fromStatus === toStatus) return;
  const allowed = RFQ_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new BadRequestException(
      `Invalid RFQ status transition: ${fromStatus} -> ${toStatus}`,
    );
  }
}

export function assertTransition(
  documentType: DocumentType,
  fromStatus: PurchaseOrderStatus | DocumentStatus,
  toStatus: PurchaseOrderStatus | DocumentStatus,
): void {
  if (documentType === 'PO') {
    assertPoTransition(fromStatus as PurchaseOrderStatus, toStatus as PurchaseOrderStatus);
    return;
  }
  assertRfqTransition(fromStatus as DocumentStatus, toStatus as DocumentStatus);
}
