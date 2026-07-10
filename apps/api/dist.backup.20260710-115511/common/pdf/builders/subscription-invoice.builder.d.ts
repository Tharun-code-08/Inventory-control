import type { SubscriptionInvoice } from '@prisma/client';
import { type DocumentLayoutViewModel } from '../templates/document-layout.template';
export declare function buildSubscriptionInvoicePdfViewModel(invoice: SubscriptionInvoice & {
    company: {
        companyName: string;
        address: string | null;
        companyCode: string;
    };
}): DocumentLayoutViewModel;
export declare function buildSubscriptionInvoicePdfHtml(invoice: SubscriptionInvoice & {
    company: {
        companyName: string;
        address: string | null;
        companyCode: string;
    };
}): string;
export declare function subscriptionInvoicePdfFilename(invoiceNumber: string): string;
