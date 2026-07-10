import { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { LifecycleOrchestratorService } from '../subscription-lifecycle/lifecycle-orchestrator.service';
import { PlatformRevenueService } from '../platform-notifications/platform-revenue.service';
import { RazorpayService } from './razorpay.service';
export declare class BillingWebhookController {
    private readonly razorpay;
    private readonly prisma;
    private readonly lifecycle;
    private readonly platformRevenue;
    private readonly logger;
    constructor(razorpay: RazorpayService, prisma: PrismaService, lifecycle: LifecycleOrchestratorService, platformRevenue: PlatformRevenueService);
    handleRazorpay(req: RawBodyRequest<Request>, signature: string | undefined): Promise<{
        ok: boolean;
    }>;
    private handlePaymentCaptured;
    private handlePaymentFailed;
}
