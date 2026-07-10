import { BillingCycle, SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class SubscriptionInvoiceService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    nextInvoiceNumber(issuedAt?: Date): Promise<string>;
    createInvoice(args: {
        companyId: string;
        plan: SubscriptionPlan;
        billingCycle: BillingCycle;
        amountPaise: number;
        taxPaise?: number;
        paymentId?: string;
        billingAddress?: {
            companyName?: string;
            address?: string;
            gstNumber?: string;
        };
        issuedAt?: Date;
    }): Promise<{
        currency: string;
        id: string;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        createdAt: Date;
        gstNumber: string | null;
        companyId: string;
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        amountPaise: number;
        invoiceNumber: string;
        taxPaise: number;
        totalPaise: number;
        billingAddressSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        issuedAt: Date;
        pdfStorageKey: string | null;
    }>;
    backfillInvoicesForCompany(companyId: string): Promise<number>;
    backfillAllPaidCompanies(): Promise<{
        companies: number;
        invoices: number;
    }>;
    listForCompany(companyId: string): Promise<{
        currency: string;
        id: string;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        invoiceNumber: string;
        totalPaise: number;
        issuedAt: Date;
    }[]>;
    getForCompany(companyId: string, invoiceId: string): Promise<{
        company: {
            companyCode: string;
            companyName: string;
            address: string | null;
        };
    } & {
        currency: string;
        id: string;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        createdAt: Date;
        gstNumber: string | null;
        companyId: string;
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        amountPaise: number;
        invoiceNumber: string;
        taxPaise: number;
        totalPaise: number;
        billingAddressSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        issuedAt: Date;
        pdfStorageKey: string | null;
    }>;
    renderPdfBuffer(companyId: string, invoiceId: string): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
}
