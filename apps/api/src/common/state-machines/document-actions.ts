/** Business actions that do not necessarily change document status. */
export enum PurchaseOrderAction {
  EDIT = 'EDIT',
  CONFIRM = 'CONFIRM',
  CANCEL = 'CANCEL',
  SEND = 'SEND',
}

export enum RfqAction {
  EDIT = 'EDIT',
  POST = 'POST',
  SEND = 'SEND',
  CREATE_PO = 'CREATE_PO',
}

export enum GrAction {
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  POST = 'POST',
  SEND = 'SEND',
  CREATE_BILL = 'CREATE_BILL',
}

export enum SupplierBillAction {
  SEND = 'SEND',
  RECORD_PAYMENT = 'RECORD_PAYMENT',
  VOID = 'VOID',
}

export enum SupplierPaymentAction {
  REVERSE = 'REVERSE',
}
