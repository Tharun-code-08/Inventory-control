import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, PurchaseOrderStatus, SupplierBillStatus } from '@prisma/client';
import { GR_TRANSITIONS } from './gr.state-machine';
import { PO_TRANSITIONS } from './po.state-machine';
import { RFQ_TRANSITIONS } from './rfq.state-machine';
import { SUPPLIER_BILL_REVERSAL_TRANSITIONS, SUPPLIER_BILL_TRANSITIONS } from './supplier-bill.state-machine';

export type DocumentType = 'PO' | 'RFQ' | 'GR' | 'SUPPLIER_BILL';

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

export function assertGrTransition(fromStatus: DocumentStatus, toStatus: DocumentStatus): void {
  if (fromStatus === toStatus) return;
  const allowed = GR_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new BadRequestException(
      `Invalid goods receipt status transition: ${fromStatus} -> ${toStatus}`,
    );
  }
}

export function assertSupplierBillTransition(
  fromStatus: SupplierBillStatus,
  toStatus: SupplierBillStatus,
): void {
  if (fromStatus === toStatus) return;
  const allowed = SUPPLIER_BILL_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new BadRequestException(
      `Invalid supplier bill status transition: ${fromStatus} -> ${toStatus}`,
    );
  }
}

export function assertSupplierBillReversalTransition(
  fromStatus: SupplierBillStatus,
  toStatus: SupplierBillStatus,
): void {
  if (fromStatus === toStatus) return;
  const allowed = SUPPLIER_BILL_REVERSAL_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new BadRequestException(
      `Invalid supplier bill reversal transition: ${fromStatus} -> ${toStatus}`,
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
