import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { LifecycleOrchestratorService } from '../subscription-lifecycle/lifecycle-orchestrator.service';
import { PlatformRevenueService } from '../platform-notifications/platform-revenue.service';
import { DUNNING_CAMPAIGN_KEYS } from '../subscription-lifecycle/lifecycle-rules.constants';
import { RazorpayService } from './razorpay.service';

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        error_description?: string;
      };
    };
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
      };
    };
  };
};

@ApiTags('billing')
@Controller('billing/webhooks')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);

  constructor(
    private readonly razorpay: RazorpayService,
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleOrchestratorService,
    private readonly platformRevenue: PlatformRevenueService,
  ) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Razorpay payment webhook (signature verified)' })
  async handleRazorpay(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    if (!this.razorpay.verifyWebhookSignature(rawBody, signature ?? '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload = (typeof req.body === 'object' ? req.body : JSON.parse(rawBody.toString())) as RazorpayWebhookPayload;
    const event = payload.event ?? '';

    if (event === 'payment.captured') {
      await this.handlePaymentCaptured(payload);
    } else if (event === 'payment.failed') {
      await this.handlePaymentFailed(payload);
    } else if (event === 'subscription.charged') {
      this.logger.log('subscription.charged received — auto-renewal stub (Phase 4)');
    }

    return { ok: true };
  }

  private async handlePaymentCaptured(payload: RazorpayWebhookPayload) {
    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;
    if (!orderId || !paymentId) return;

    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { razorpayOrderId: orderId },
      include: { company: { select: { companyName: true, paidActivatedAt: true } } },
    });
    if (!payment) return;

    const wasPaid = payment.status === 'paid';
    await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId: paymentId,
        status: 'paid',
        verifiedAt: new Date(),
        failureReason: null,
      },
    });

    if (
      !wasPaid &&
      payment.company?.paidActivatedAt &&
      payment.companyId &&
      payment.company.companyName
    ) {
      await this.platformRevenue
        .onSubscriptionRenewed({
          companyId: payment.companyId,
          companyName: payment.company.companyName,
          plan: payment.plan,
          amountPaise: payment.amountPaise,
          paymentId: payment.id,
        })
        .catch(() => undefined);
    }
  }

  private async handlePaymentFailed(payload: RazorpayWebhookPayload) {
    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    if (!orderId) return;

    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!payment?.companyId) return;

    const renewalAttempt = Math.min(payment.renewalAttempt + 1, DUNNING_CAMPAIGN_KEYS.length - 1);
    const owner = await this.lifecycle.resolveOwnerEmail(payment.companyId);
    if (!owner) return;

    await this.lifecycle.onPaymentFailed({
      companyId: payment.companyId,
      ownerEmail: owner.email,
      companyName: owner.companyName,
      paymentId: payment.id,
      failureReason: paymentEntity?.error_description,
      renewalAttempt,
    });
  }
}
