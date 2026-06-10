export type InvoiceCreatedEmailContent = {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  companyName: string;
};

export function invoiceCreatedSubject(content: InvoiceCreatedEmailContent): string {
  return `Invoice ${content.invoiceNumber} from ${content.companyName}`;
}

export function invoiceCreatedText(content: InvoiceCreatedEmailContent): string {
  return [
    `Dear ${content.customerName},`,
    '',
    `Invoice ${content.invoiceNumber} dated ${content.invoiceDate} has been raised.`,
    `Due date: ${content.dueDate}`,
    `Amount: ${content.totalAmount}`,
    '',
    'Thank you,',
    content.companyName,
  ].join('\n');
}

export function invoiceCreatedHtml(content: InvoiceCreatedEmailContent): string {
  return `<p>Dear ${content.customerName},</p><p>Invoice <strong>${content.invoiceNumber}</strong> dated ${content.invoiceDate} has been raised.</p><p>Due date: ${content.dueDate}<br/>Amount: ${content.totalAmount}</p><p>Thank you,<br/>${content.companyName}</p>`;
}

export type PaymentReceivedEmailContent = {
  customerName: string;
  invoiceNumber: string;
  receiptNumber: string;
  amountPaid: string;
  balanceDue: string;
  paymentType: string;
  companyName: string;
};

export function paymentReceivedSubject(content: PaymentReceivedEmailContent): string {
  return `Payment received for invoice ${content.invoiceNumber}`;
}

export function paymentReceivedText(content: PaymentReceivedEmailContent): string {
  return [
    `Dear ${content.customerName},`,
    '',
    `We received ${content.paymentType} payment of ${content.amountPaid} against invoice ${content.invoiceNumber}.`,
    `Receipt: ${content.receiptNumber}`,
    `Balance due: ${content.balanceDue}`,
    '',
    'Thank you,',
    content.companyName,
  ].join('\n');
}

export function paymentReceivedHtml(content: PaymentReceivedEmailContent): string {
  return `<p>Dear ${content.customerName},</p><p>We received ${content.paymentType} payment of ${content.amountPaid} against invoice ${content.invoiceNumber}.</p><p>Receipt: ${content.receiptNumber}<br/>Balance due: ${content.balanceDue}</p><p>Thank you,<br/>${content.companyName}</p>`;
}

export type SalesOrderCustomerEmailContent = {
  customerName: string;
  soNumber: string;
  orderDate: string;
  expectedDate: string;
  totalAmount: string;
  shopName: string;
  companyName: string;
};

export function salesOrderCustomerSubject(content: SalesOrderCustomerEmailContent): string {
  return `Sales Order ${content.soNumber} — ${content.companyName}`;
}

export function salesOrderCustomerText(content: SalesOrderCustomerEmailContent): string {
  return [
    `Dear ${content.customerName},`,
    '',
    `Please find sales order ${content.soNumber} dated ${content.orderDate}.`,
    `Expected date: ${content.expectedDate}`,
    `Plant: ${content.shopName}`,
    `Total: ${content.totalAmount}`,
    '',
    'Thank you,',
    content.companyName,
  ].join('\n');
}

export function salesOrderCustomerHtml(content: SalesOrderCustomerEmailContent): string {
  return `<p>Dear ${content.customerName},</p><p>Please find sales order <strong>${content.soNumber}</strong> dated ${content.orderDate}.</p><p>Expected date: ${content.expectedDate}<br/>Plant: ${content.shopName}<br/>Total: ${content.totalAmount}</p><p>Thank you,<br/>${content.companyName}</p>`;
}

export type SupplierBillIssuedEmailContent = {
  supplierName: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  totalAmount: string;
  poNumber: string;
  companyName: string;
};

export function supplierBillIssuedSubject(content: SupplierBillIssuedEmailContent): string {
  return `Supplier Bill ${content.billNumber} — ${content.companyName}`;
}

export function supplierBillIssuedText(content: SupplierBillIssuedEmailContent): string {
  return [
    `Hello ${content.supplierName},`,
    '',
    `Supplier bill ${content.billNumber} dated ${content.billDate} has been issued.`,
    `Due date: ${content.dueDate}`,
    content.poNumber ? `Purchase order: ${content.poNumber}` : '',
    `Amount: ${content.totalAmount}`,
    '',
    content.companyName,
  ]
    .filter(Boolean)
    .join('\n');
}

export function supplierBillIssuedHtml(content: SupplierBillIssuedEmailContent): string {
  const poLine = content.poNumber ? `<br/>Purchase order: ${content.poNumber}` : '';
  return `<p>Hello ${content.supplierName},</p><p>Supplier bill <strong>${content.billNumber}</strong> dated ${content.billDate} has been issued.</p><p>Due date: ${content.dueDate}${poLine}<br/>Amount: ${content.totalAmount}</p><p>${content.companyName}</p>`;
}

export type SupplierPaymentRecordedEmailContent = {
  supplierName: string;
  billNumber: string;
  paymentNumber: string;
  amountPaid: string;
  balanceDue: string;
  paymentType: string;
  companyName: string;
};

export function supplierPaymentRecordedSubject(content: SupplierPaymentRecordedEmailContent): string {
  return `Payment recorded for bill ${content.billNumber}`;
}

export function supplierPaymentRecordedText(content: SupplierPaymentRecordedEmailContent): string {
  return [
    `Hello ${content.supplierName},`,
    '',
    `We recorded ${content.paymentType} payment of ${content.amountPaid} against bill ${content.billNumber}.`,
    `Payment ref: ${content.paymentNumber}`,
    `Balance due: ${content.balanceDue}`,
    '',
    content.companyName,
  ].join('\n');
}

export function supplierPaymentRecordedHtml(content: SupplierPaymentRecordedEmailContent): string {
  return `<p>Hello ${content.supplierName},</p><p>We recorded ${content.paymentType} payment of ${content.amountPaid} against bill ${content.billNumber}.</p><p>Payment ref: ${content.paymentNumber}<br/>Balance due: ${content.balanceDue}</p><p>${content.companyName}</p>`;
}

export type PaymentReminderEmailContent = {
  customerName: string;
  invoiceNumber: string;
  dueDate: string;
  daysUntilDue: string;
  balanceDue: string;
  companyName: string;
};

export function paymentReminderSubject(content: PaymentReminderEmailContent): string {
  return `Reminder: Invoice ${content.invoiceNumber} due on ${content.dueDate}`;
}

export function paymentReminderText(content: PaymentReminderEmailContent): string {
  return [
    `Dear ${content.customerName},`,
    '',
    `This is a reminder that invoice ${content.invoiceNumber} is due in ${content.daysUntilDue} day(s) on ${content.dueDate}.`,
    `Balance due: ${content.balanceDue}`,
    '',
    'Thank you,',
    content.companyName,
  ].join('\n');
}

export function paymentReminderHtml(content: PaymentReminderEmailContent): string {
  return `<p>Dear ${content.customerName},</p><p>This is a reminder that invoice <strong>${content.invoiceNumber}</strong> is due in ${content.daysUntilDue} day(s) on ${content.dueDate}.</p><p>Balance due: ${content.balanceDue}</p><p>Thank you,<br/>${content.companyName}</p>`;
}

export type InternalAlertEmailContent = {
  title: string;
  message: string;
  companyName: string;
};

export type GoodsReceiptSupplierEmailContent = {
  supplierName: string;
  grNumber: string;
  grDate: string;
  shopName: string;
  totalAmount: string;
  poNumber: string;
  companyName: string;
};

export function goodsReceiptSupplierSubject(content: GoodsReceiptSupplierEmailContent): string {
  return `Goods Receipt ${content.grNumber} — ${content.companyName}`;
}

export function goodsReceiptSupplierText(content: GoodsReceiptSupplierEmailContent): string {
  return [
    `Hello ${content.supplierName},`,
    '',
    `Goods receipt ${content.grNumber} dated ${content.grDate} has been posted for ${content.shopName}.`,
    `Purchase order: ${content.poNumber}`,
    `Total: ${content.totalAmount}`,
    '',
    content.companyName,
  ].join('\n');
}

export function goodsReceiptSupplierHtml(content: GoodsReceiptSupplierEmailContent): string {
  return `<p>Hello ${content.supplierName},</p><p>Goods receipt <strong>${content.grNumber}</strong> dated ${content.grDate} has been posted for ${content.shopName}.</p><p>Purchase order: ${content.poNumber}<br/>Total: ${content.totalAmount}</p><p>${content.companyName}</p>`;
}

export function internalAlertSubject(content: InternalAlertEmailContent): string {
  return `[SoftdigitIMS] ${content.title}`;
}

export function internalAlertText(content: InternalAlertEmailContent): string {
  return `${content.title}\n\n${content.message}\n\n${content.companyName}`;
}

export function internalAlertHtml(content: InternalAlertEmailContent): string {
  return `<p><strong>${content.title}</strong></p><p>${content.message}</p><p>${content.companyName}</p>`;
}
