"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareOutboundTemplate = prepareOutboundTemplate;
exports.rfqInviteDefaults = rfqInviteDefaults;
exports.purchaseOrderDefaults = purchaseOrderDefaults;
exports.salesQuotationDefaults = salesQuotationDefaults;
exports.returnNoticeDefaults = returnNoticeDefaults;
exports.userInviteDefaults = userInviteDefaults;
exports.invoiceCreatedDefaults = invoiceCreatedDefaults;
exports.paymentReceivedDefaults = paymentReceivedDefaults;
exports.salesOrderCustomerDefaults = salesOrderCustomerDefaults;
exports.supplierBillIssuedDefaults = supplierBillIssuedDefaults;
exports.supplierPaymentRecordedDefaults = supplierPaymentRecordedDefaults;
exports.goodsReceiptSupplierDefaults = goodsReceiptSupplierDefaults;
const purchase_order_supplier_template_1 = require("../../common/mail/purchase-order-supplier.template");
const return_notice_template_1 = require("../../common/mail/return-notice.template");
const rfq_invite_template_1 = require("../../common/mail/rfq-invite.template");
const sales_quotation_template_1 = require("../../common/mail/sales-quotation.template");
const transactional_email_templates_1 = require("../../common/mail/transactional-email.templates");
const user_invite_template_1 = require("../../common/mail/user-invite.template");
async function prepareOutboundTemplate(service, shopId, templateId, defaults, context) {
    return service.prepareTemplateForShop(shopId, templateId, defaults, context);
}
function rfqInviteDefaults(content) {
    return {
        subject: (0, rfq_invite_template_1.rfqInviteSubject)(content),
        text: (0, rfq_invite_template_1.rfqInviteText)(content),
        html: (0, rfq_invite_template_1.rfqInviteHtml)(content),
        context: {
            supplier_name: content.supplierName,
            rfq_number: content.rfqNumber,
            rfq_title: content.rfqTitle,
            deadline: content.deadline ?? '',
            portal_url: content.portalUrl,
            access_code: content.accessCode,
            company_name: 'Softdigit Consulting',
        },
    };
}
function purchaseOrderDefaults(content) {
    return {
        subject: (0, purchase_order_supplier_template_1.purchaseOrderSubject)(content),
        text: (0, purchase_order_supplier_template_1.purchaseOrderText)(content),
        html: (0, purchase_order_supplier_template_1.purchaseOrderHtml)(content),
        context: {
            supplier_name: content.supplierName,
            po_number: content.poNumber,
            po_date: content.poDate,
            shop_name: content.shopName,
            total_value: content.totalValue,
            company_name: content.companyName,
        },
    };
}
function salesQuotationDefaults(content) {
    return {
        subject: (0, sales_quotation_template_1.salesQuotationSubject)(content),
        text: (0, sales_quotation_template_1.salesQuotationText)(content),
        html: (0, sales_quotation_template_1.salesQuotationHtml)(content),
        context: {
            customer_name: content.customerName,
            quote_number: content.quoteNumber,
            quote_date: content.quoteDate,
            valid_until: content.validUntil ?? '',
            total_amount: content.totalValue,
            company_name: content.companyName,
            portal_url: content.portalUrl ?? '',
        },
    };
}
function returnNoticeDefaults(content) {
    return {
        subject: (0, return_notice_template_1.returnNoticeSubject)(content),
        text: (0, return_notice_template_1.returnNoticeText)(content),
        html: (0, return_notice_template_1.returnNoticeHtml)(content),
        context: {
            supplier_name: content.supplierName,
            return_number: content.returnNumber,
            gr_number: content.grNumber,
            company_name: content.companyName,
        },
    };
}
function userInviteDefaults(content) {
    return {
        subject: (0, user_invite_template_1.userInviteSubject)(content.companyName),
        text: (0, user_invite_template_1.userInviteText)(content),
        html: (0, user_invite_template_1.userInviteHtml)(content),
        context: {
            invitee_name: content.inviteeName ?? '',
            invitee_email: content.inviteeEmail,
            inviter_name: content.inviterName,
            role_name: content.roleName,
            shop_name: content.shopName ?? '',
            invite_url: content.inviteUrl,
            company_name: content.companyName,
        },
    };
}
function invoiceCreatedDefaults(content) {
    return {
        subject: (0, transactional_email_templates_1.invoiceCreatedSubject)(content),
        text: (0, transactional_email_templates_1.invoiceCreatedText)(content),
        html: (0, transactional_email_templates_1.invoiceCreatedHtml)(content),
        context: {
            customer_name: content.customerName,
            invoice_number: content.invoiceNumber,
            invoice_date: content.invoiceDate,
            due_date: content.dueDate,
            total_amount: content.totalAmount,
            company_name: content.companyName,
        },
    };
}
function paymentReceivedDefaults(content) {
    return {
        subject: (0, transactional_email_templates_1.paymentReceivedSubject)(content),
        text: (0, transactional_email_templates_1.paymentReceivedText)(content),
        html: (0, transactional_email_templates_1.paymentReceivedHtml)(content),
        context: {
            customer_name: content.customerName,
            invoice_number: content.invoiceNumber,
            receipt_number: content.receiptNumber,
            amount_paid: content.amountPaid,
            balance_due: content.balanceDue,
            payment_type: content.paymentType,
            company_name: content.companyName,
        },
    };
}
function salesOrderCustomerDefaults(content) {
    return {
        subject: (0, transactional_email_templates_1.salesOrderCustomerSubject)(content),
        text: (0, transactional_email_templates_1.salesOrderCustomerText)(content),
        html: (0, transactional_email_templates_1.salesOrderCustomerHtml)(content),
        context: {
            customer_name: content.customerName,
            so_number: content.soNumber,
            order_date: content.orderDate,
            expected_date: content.expectedDate,
            total_amount: content.totalAmount,
            shop_name: content.shopName,
            company_name: content.companyName,
        },
    };
}
function supplierBillIssuedDefaults(content) {
    return {
        subject: (0, transactional_email_templates_1.supplierBillIssuedSubject)(content),
        text: (0, transactional_email_templates_1.supplierBillIssuedText)(content),
        html: (0, transactional_email_templates_1.supplierBillIssuedHtml)(content),
        context: {
            supplier_name: content.supplierName,
            bill_number: content.billNumber,
            bill_date: content.billDate,
            due_date: content.dueDate,
            total_amount: content.totalAmount,
            po_number: content.poNumber,
            company_name: content.companyName,
        },
    };
}
function supplierPaymentRecordedDefaults(content) {
    return {
        subject: (0, transactional_email_templates_1.supplierPaymentRecordedSubject)(content),
        text: (0, transactional_email_templates_1.supplierPaymentRecordedText)(content),
        html: (0, transactional_email_templates_1.supplierPaymentRecordedHtml)(content),
        context: {
            supplier_name: content.supplierName,
            bill_number: content.billNumber,
            payment_number: content.paymentNumber,
            amount_paid: content.amountPaid,
            balance_due: content.balanceDue,
            payment_type: content.paymentType,
            company_name: content.companyName,
        },
    };
}
function goodsReceiptSupplierDefaults(content) {
    return {
        subject: (0, transactional_email_templates_1.goodsReceiptSupplierSubject)(content),
        text: (0, transactional_email_templates_1.goodsReceiptSupplierText)(content),
        html: (0, transactional_email_templates_1.goodsReceiptSupplierHtml)(content),
        context: {
            supplier_name: content.supplierName,
            gr_number: content.grNumber,
            gr_date: content.grDate,
            shop_name: content.shopName,
            total_value: content.totalAmount,
            po_number: content.poNumber,
            company_name: content.companyName,
        },
    };
}
//# sourceMappingURL=email-notifications.outbound.js.map