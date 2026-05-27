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

export function internalAlertSubject(content: InternalAlertEmailContent): string {
  return `[Retail IMS] ${content.title}`;
}

export function internalAlertText(content: InternalAlertEmailContent): string {
  return `${content.title}\n\n${content.message}\n\n${content.companyName}`;
}

export function internalAlertHtml(content: InternalAlertEmailContent): string {
  return `<p><strong>${content.title}</strong></p><p>${content.message}</p><p>${content.companyName}</p>`;
}
