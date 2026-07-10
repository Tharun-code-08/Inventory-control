"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceCreatedSubject = invoiceCreatedSubject;
exports.invoiceCreatedText = invoiceCreatedText;
exports.invoiceCreatedHtml = invoiceCreatedHtml;
exports.paymentReceivedSubject = paymentReceivedSubject;
exports.paymentReceivedText = paymentReceivedText;
exports.paymentReceivedHtml = paymentReceivedHtml;
exports.salesOrderCustomerSubject = salesOrderCustomerSubject;
exports.salesOrderCustomerText = salesOrderCustomerText;
exports.salesOrderCustomerHtml = salesOrderCustomerHtml;
exports.supplierBillIssuedSubject = supplierBillIssuedSubject;
exports.supplierBillIssuedText = supplierBillIssuedText;
exports.supplierBillIssuedHtml = supplierBillIssuedHtml;
exports.supplierPaymentRecordedSubject = supplierPaymentRecordedSubject;
exports.supplierPaymentRecordedText = supplierPaymentRecordedText;
exports.supplierPaymentRecordedHtml = supplierPaymentRecordedHtml;
exports.paymentReminderSubject = paymentReminderSubject;
exports.paymentReminderText = paymentReminderText;
exports.paymentReminderHtml = paymentReminderHtml;
exports.goodsReceiptSupplierSubject = goodsReceiptSupplierSubject;
exports.goodsReceiptSupplierText = goodsReceiptSupplierText;
exports.goodsReceiptSupplierHtml = goodsReceiptSupplierHtml;
exports.internalAlertSubject = internalAlertSubject;
exports.internalAlertText = internalAlertText;
exports.internalAlertHtml = internalAlertHtml;
function invoiceCreatedSubject(content) {
    return `Invoice ${content.invoiceNumber} from ${content.companyName}`;
}
function invoiceCreatedText(content) {
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
function invoiceCreatedHtml(content) {
    return `<p>Dear ${content.customerName},</p><p>Invoice <strong>${content.invoiceNumber}</strong> dated ${content.invoiceDate} has been raised.</p><p>Due date: ${content.dueDate}<br/>Amount: ${content.totalAmount}</p><p>Thank you,<br/>${content.companyName}</p>`;
}
function paymentReceivedSubject(content) {
    return `Payment received for invoice ${content.invoiceNumber}`;
}
function paymentReceivedText(content) {
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
function paymentReceivedHtml(content) {
    return `<p>Dear ${content.customerName},</p><p>We received ${content.paymentType} payment of ${content.amountPaid} against invoice ${content.invoiceNumber}.</p><p>Receipt: ${content.receiptNumber}<br/>Balance due: ${content.balanceDue}</p><p>Thank you,<br/>${content.companyName}</p>`;
}
function salesOrderCustomerSubject(content) {
    return `Sales Order ${content.soNumber} — ${content.companyName}`;
}
function salesOrderCustomerText(content) {
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
function salesOrderCustomerHtml(content) {
    return `<p>Dear ${content.customerName},</p><p>Please find sales order <strong>${content.soNumber}</strong> dated ${content.orderDate}.</p><p>Expected date: ${content.expectedDate}<br/>Plant: ${content.shopName}<br/>Total: ${content.totalAmount}</p><p>Thank you,<br/>${content.companyName}</p>`;
}
function supplierBillIssuedSubject(content) {
    return `Supplier Bill ${content.billNumber} — ${content.companyName}`;
}
function supplierBillIssuedText(content) {
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
function supplierBillIssuedHtml(content) {
    const poLine = content.poNumber ? `<br/>Purchase order: ${content.poNumber}` : '';
    return `<p>Hello ${content.supplierName},</p><p>Supplier bill <strong>${content.billNumber}</strong> dated ${content.billDate} has been issued.</p><p>Due date: ${content.dueDate}${poLine}<br/>Amount: ${content.totalAmount}</p><p>${content.companyName}</p>`;
}
function supplierPaymentRecordedSubject(content) {
    return `Payment recorded for bill ${content.billNumber}`;
}
function supplierPaymentRecordedText(content) {
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
function supplierPaymentRecordedHtml(content) {
    return `<p>Hello ${content.supplierName},</p><p>We recorded ${content.paymentType} payment of ${content.amountPaid} against bill ${content.billNumber}.</p><p>Payment ref: ${content.paymentNumber}<br/>Balance due: ${content.balanceDue}</p><p>${content.companyName}</p>`;
}
function paymentReminderSubject(content) {
    return `Reminder: Invoice ${content.invoiceNumber} due on ${content.dueDate}`;
}
function paymentReminderText(content) {
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
function paymentReminderHtml(content) {
    return `<p>Dear ${content.customerName},</p><p>This is a reminder that invoice <strong>${content.invoiceNumber}</strong> is due in ${content.daysUntilDue} day(s) on ${content.dueDate}.</p><p>Balance due: ${content.balanceDue}</p><p>Thank you,<br/>${content.companyName}</p>`;
}
function goodsReceiptSupplierSubject(content) {
    return `Goods Receipt ${content.grNumber} — ${content.companyName}`;
}
function goodsReceiptSupplierText(content) {
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
function goodsReceiptSupplierHtml(content) {
    return `<p>Hello ${content.supplierName},</p><p>Goods receipt <strong>${content.grNumber}</strong> dated ${content.grDate} has been posted for ${content.shopName}.</p><p>Purchase order: ${content.poNumber}<br/>Total: ${content.totalAmount}</p><p>${content.companyName}</p>`;
}
function internalAlertSubject(content) {
    return `[SoftdigitIMS] ${content.title}`;
}
function internalAlertText(content) {
    return `${content.title}\n\n${content.message}\n\n${content.companyName}`;
}
function internalAlertHtml(content) {
    return `<p><strong>${content.title}</strong></p><p>${content.message}</p><p>${content.companyName}</p>`;
}
//# sourceMappingURL=transactional-email.templates.js.map