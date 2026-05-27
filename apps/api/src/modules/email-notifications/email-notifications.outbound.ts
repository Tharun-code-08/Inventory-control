import {
  purchaseOrderHtml,
  purchaseOrderSubject,
  purchaseOrderText,
  type PurchaseOrderEmailContent,
} from '../../common/mail/purchase-order-supplier.template';
import {
  returnNoticeHtml,
  returnNoticeSubject,
  returnNoticeText,
  type ReturnNoticeEmailContent,
} from '../../common/mail/return-notice.template';
import {
  rfqInviteHtml,
  rfqInviteSubject,
  rfqInviteText,
  type RfqInviteEmailContent,
} from '../../common/mail/rfq-invite.template';
import {
  salesQuotationHtml,
  salesQuotationSubject,
  salesQuotationText,
  type SalesQuotationEmailContent,
} from '../../common/mail/sales-quotation.template';
import {
  invoiceCreatedHtml,
  invoiceCreatedSubject,
  invoiceCreatedText,
  paymentReceivedHtml,
  paymentReceivedSubject,
  paymentReceivedText,
  type InvoiceCreatedEmailContent,
  type PaymentReceivedEmailContent,
} from '../../common/mail/transactional-email.templates';
import {
  userInviteHtml,
  userInviteSubject,
  userInviteText,
  type UserInviteEmailContent,
} from '../../common/mail/user-invite.template';
import type { EmailTemplateId } from './email-notifications.constants';
import type { EmailNotificationsService } from './email-notifications.service';

export async function prepareOutboundTemplate(
  service: EmailNotificationsService,
  shopId: string | null | undefined,
  templateId: EmailTemplateId,
  defaults: { subject: string; text: string; html: string },
  context: Record<string, string | number | null | undefined>,
) {
  return service.prepareTemplateForShop(shopId, templateId, defaults, context);
}

export function rfqInviteDefaults(content: RfqInviteEmailContent) {
  return {
    subject: rfqInviteSubject(content),
    text: rfqInviteText(content),
    html: rfqInviteHtml(content),
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

export function purchaseOrderDefaults(content: PurchaseOrderEmailContent) {
  return {
    subject: purchaseOrderSubject(content),
    text: purchaseOrderText(content),
    html: purchaseOrderHtml(content),
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

export function salesQuotationDefaults(content: SalesQuotationEmailContent) {
  return {
    subject: salesQuotationSubject(content),
    text: salesQuotationText(content),
    html: salesQuotationHtml(content),
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

export function returnNoticeDefaults(content: ReturnNoticeEmailContent) {
  return {
    subject: returnNoticeSubject(content),
    text: returnNoticeText(content),
    html: returnNoticeHtml(content),
    context: {
      supplier_name: content.supplierName,
      return_number: content.returnNumber,
      gr_number: content.grNumber,
      company_name: content.companyName,
    },
  };
}

export function userInviteDefaults(content: UserInviteEmailContent) {
  return {
    subject: userInviteSubject(content.companyName),
    text: userInviteText(content),
    html: userInviteHtml(content),
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

export function invoiceCreatedDefaults(content: InvoiceCreatedEmailContent) {
  return {
    subject: invoiceCreatedSubject(content),
    text: invoiceCreatedText(content),
    html: invoiceCreatedHtml(content),
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

export function paymentReceivedDefaults(content: PaymentReceivedEmailContent) {
  return {
    subject: paymentReceivedSubject(content),
    text: paymentReceivedText(content),
    html: paymentReceivedHtml(content),
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
