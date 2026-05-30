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
