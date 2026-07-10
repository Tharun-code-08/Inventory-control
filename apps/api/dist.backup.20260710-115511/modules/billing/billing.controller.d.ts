import type { Response } from 'express';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { LifecycleOrchestratorService } from '../subscription-lifecycle/lifecycle-orchestrator.service';
import { SubscriptionInvoiceService } from '../subscription-lifecycle/subscription-invoice.service';
import { CreateOrderDto, VerifyPaymentDto } from './dto/billing.dto';
import { RazorpayService } from './razorpay.service';
import { SubscriptionService } from './subscription.service';
export declare class BillingController {
    private readonly razorpay;
    private readonly subscriptions;
    private readonly prisma;
    private readonly lifecycle;
    private readonly invoices;
    constructor(razorpay: RazorpayService, subscriptions: SubscriptionService, prisma: PrismaService, lifecycle: LifecycleOrchestratorService, invoices: SubscriptionInvoiceService);
    createOrder(dto: CreateOrderDto): Promise<{
        order_id: string;
        amount: number;
        currency: string;
        key_id: string | undefined;
    }>;
    verifyPayment(dto: VerifyPaymentDto): Promise<{
        ok: boolean;
        order_id: string;
        payment_id: string;
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        billing_cycle: import(".prisma/client").$Enums.BillingCycle;
    }>;
    subscription(user: RequestUser): Promise<import("./subscription.service").SubscriptionSnapshot>;
    upgrade(user: RequestUser, dto: VerifyPaymentDto): Promise<import("./subscription.service").SubscriptionSnapshot | null>;
    marketingOptOut(user: RequestUser): Promise<{
        ok: boolean;
    }>;
    listInvoices(user: RequestUser): Promise<{
        currency: string;
        id: string;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        invoiceNumber: string;
        totalPaise: number;
        issuedAt: Date;
    }[]>;
    downloadInvoicePdf(user: RequestUser, invoiceId: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
