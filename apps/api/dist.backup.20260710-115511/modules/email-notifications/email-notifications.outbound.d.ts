import { type PurchaseOrderEmailContent } from '../../common/mail/purchase-order-supplier.template';
import { type ReturnNoticeEmailContent } from '../../common/mail/return-notice.template';
import { type RfqInviteEmailContent } from '../../common/mail/rfq-invite.template';
import { type SalesQuotationEmailContent } from '../../common/mail/sales-quotation.template';
import { type GoodsReceiptSupplierEmailContent, type InvoiceCreatedEmailContent, type PaymentReceivedEmailContent, type SalesOrderCustomerEmailContent, type SupplierBillIssuedEmailContent, type SupplierPaymentRecordedEmailContent } from '../../common/mail/transactional-email.templates';
import { type UserInviteEmailContent } from '../../common/mail/user-invite.template';
import type { EmailTemplateId } from './email-notifications.constants';
import type { EmailNotificationsService } from './email-notifications.service';
export declare function prepareOutboundTemplate(service: EmailNotificationsService, shopId: string | null | undefined, templateId: EmailTemplateId, defaults: {
    subject: string;
    text: string;
    html: string;
}, context: Record<string, string | number | null | undefined>): Promise<{
    enabled: true;
    subject: string;
    text: string;
    html: string;
    cc?: string[];
    bcc?: string[];
} | {
    enabled: false;
}>;
export declare function rfqInviteDefaults(content: RfqInviteEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        supplier_name: string;
        rfq_number: string;
        rfq_title: string;
        deadline: string;
        portal_url: string;
        access_code: string;
        company_name: string;
    };
};
export declare function purchaseOrderDefaults(content: PurchaseOrderEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        supplier_name: string;
        po_number: string;
        po_date: string;
        shop_name: string;
        total_value: string;
        company_name: string;
    };
};
export declare function salesQuotationDefaults(content: SalesQuotationEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        customer_name: string;
        quote_number: string;
        quote_date: string;
        valid_until: string;
        total_amount: string;
        company_name: string;
        portal_url: string;
    };
};
export declare function returnNoticeDefaults(content: ReturnNoticeEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        supplier_name: string;
        return_number: string;
        gr_number: string;
        company_name: string;
    };
};
export declare function userInviteDefaults(content: UserInviteEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        invitee_name: string;
        invitee_email: string;
        inviter_name: string;
        role_name: string;
        shop_name: string;
        invite_url: string;
        company_name: string;
    };
};
export declare function invoiceCreatedDefaults(content: InvoiceCreatedEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        customer_name: string;
        invoice_number: string;
        invoice_date: string;
        due_date: string;
        total_amount: string;
        company_name: string;
    };
};
export declare function paymentReceivedDefaults(content: PaymentReceivedEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        customer_name: string;
        invoice_number: string;
        receipt_number: string;
        amount_paid: string;
        balance_due: string;
        payment_type: string;
        company_name: string;
    };
};
export declare function salesOrderCustomerDefaults(content: SalesOrderCustomerEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        customer_name: string;
        so_number: string;
        order_date: string;
        expected_date: string;
        total_amount: string;
        shop_name: string;
        company_name: string;
    };
};
export declare function supplierBillIssuedDefaults(content: SupplierBillIssuedEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        supplier_name: string;
        bill_number: string;
        bill_date: string;
        due_date: string;
        total_amount: string;
        po_number: string;
        company_name: string;
    };
};
export declare function supplierPaymentRecordedDefaults(content: SupplierPaymentRecordedEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        supplier_name: string;
        bill_number: string;
        payment_number: string;
        amount_paid: string;
        balance_due: string;
        payment_type: string;
        company_name: string;
    };
};
export declare function goodsReceiptSupplierDefaults(content: GoodsReceiptSupplierEmailContent): {
    subject: string;
    text: string;
    html: string;
    context: {
        supplier_name: string;
        gr_number: string;
        gr_date: string;
        shop_name: string;
        total_value: string;
        po_number: string;
        company_name: string;
    };
};
