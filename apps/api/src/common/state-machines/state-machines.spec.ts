import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, PurchaseOrderStatus, SupplierBillStatus } from '@prisma/client';
import { GrAction, PurchaseOrderAction, RfqAction, SupplierBillAction } from './document-actions';
import { assertGrAction, assertPoAction, assertRfqAction, assertSupplierBillAction } from './assert-action';
import { assertGrTransition, assertPoTransition, assertRfqTransition, assertSupplierBillReversalTransition, assertSupplierBillTransition } from './assert-transition';

describe('PO state machine', () => {
  it('allows DRAFT -> CONFIRMED and DRAFT -> CANCELLED', () => {
    expect(() =>
      assertPoTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CONFIRMED),
    ).not.toThrow();
    expect(() =>
      assertPoTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CANCELLED),
    ).not.toThrow();
  });

  it('allows CONFIRMED -> CANCELLED', () => {
    expect(() =>
      assertPoTransition(PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.CANCELLED),
    ).not.toThrow();
  });

  it('rejects illegal PO transitions', () => {
    expect(() =>
      assertPoTransition(PurchaseOrderStatus.CANCELLED, PurchaseOrderStatus.CONFIRMED),
    ).toThrow(BadRequestException);
    expect(() =>
      assertPoTransition(PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.DRAFT),
    ).toThrow(BadRequestException);
  });

  it('allows actions only in permitted statuses', () => {
    expect(() => assertPoAction(PurchaseOrderStatus.DRAFT, PurchaseOrderAction.EDIT)).not.toThrow();
    expect(() => assertPoAction(PurchaseOrderStatus.CONFIRMED, PurchaseOrderAction.SEND)).not.toThrow();
    expect(() => assertPoAction(PurchaseOrderStatus.DRAFT, PurchaseOrderAction.CANCEL)).not.toThrow();
    expect(() => assertPoAction(PurchaseOrderStatus.CONFIRMED, PurchaseOrderAction.CANCEL)).not.toThrow();
  });

  it('rejects illegal PO actions', () => {
    expect(() => assertPoAction(PurchaseOrderStatus.CONFIRMED, PurchaseOrderAction.EDIT)).toThrow(
      BadRequestException,
    );
    expect(() => assertPoAction(PurchaseOrderStatus.DRAFT, PurchaseOrderAction.SEND)).toThrow(
      BadRequestException,
    );
    expect(() => assertPoAction(PurchaseOrderStatus.CANCELLED, PurchaseOrderAction.CANCEL)).toThrow(
      BadRequestException,
    );
  });
});

describe('RFQ state machine', () => {
  it('allows DRAFT -> POSTED', () => {
    expect(() => assertRfqTransition(DocumentStatus.DRAFT, DocumentStatus.POSTED)).not.toThrow();
  });

  it('rejects illegal RFQ transitions', () => {
    expect(() => assertRfqTransition(DocumentStatus.POSTED, DocumentStatus.DRAFT)).toThrow(
      BadRequestException,
    );
  });

  it('allows actions only in permitted statuses', () => {
    expect(() => assertRfqAction(DocumentStatus.DRAFT, RfqAction.EDIT)).not.toThrow();
    expect(() => assertRfqAction(DocumentStatus.DRAFT, RfqAction.POST)).not.toThrow();
    expect(() => assertRfqAction(DocumentStatus.POSTED, RfqAction.SEND)).not.toThrow();
    expect(() => assertRfqAction(DocumentStatus.POSTED, RfqAction.CREATE_PO)).not.toThrow();
  });

  it('rejects illegal RFQ actions', () => {
    expect(() => assertRfqAction(DocumentStatus.POSTED, RfqAction.EDIT)).toThrow(
      BadRequestException,
    );
    expect(() => assertRfqAction(DocumentStatus.DRAFT, RfqAction.CREATE_PO)).toThrow(
      BadRequestException,
    );
  });
});

describe('GR state machine', () => {
  it('allows DRAFT -> POSTED', () => {
    expect(() => assertGrTransition(DocumentStatus.DRAFT, DocumentStatus.POSTED)).not.toThrow();
  });

  it('allows CREATE_BILL only on POSTED goods receipts', () => {
    expect(() => assertGrAction(DocumentStatus.POSTED, GrAction.CREATE_BILL)).not.toThrow();
    expect(() => assertGrAction(DocumentStatus.DRAFT, GrAction.CREATE_BILL)).toThrow(
      BadRequestException,
    );
  });
});

describe('Supplier bill state machine', () => {
  it('allows ISSUED -> PARTIALLY_PAID and PAID', () => {
    expect(() =>
      assertSupplierBillTransition(
        SupplierBillStatus.ISSUED,
        SupplierBillStatus.PARTIALLY_PAID,
      ),
    ).not.toThrow();
    expect(() =>
      assertSupplierBillTransition(SupplierBillStatus.ISSUED, SupplierBillStatus.PAID),
    ).not.toThrow();
  });

  it('allows payment recording only on ISSUED or PARTIALLY_PAID bills', () => {
    expect(() =>
      assertSupplierBillAction(SupplierBillStatus.ISSUED, SupplierBillAction.RECORD_PAYMENT),
    ).not.toThrow();
    expect(() =>
      assertSupplierBillAction(SupplierBillStatus.PAID, SupplierBillAction.RECORD_PAYMENT),
    ).toThrow(BadRequestException);
  });

  it('allows reversal transitions back to open bill states', () => {
    expect(() =>
      assertSupplierBillReversalTransition(
        SupplierBillStatus.PAID,
        SupplierBillStatus.PARTIALLY_PAID,
      ),
    ).not.toThrow();
    expect(() =>
      assertSupplierBillReversalTransition(
        SupplierBillStatus.PARTIALLY_PAID,
        SupplierBillStatus.ISSUED,
      ),
    ).not.toThrow();
  });
});
