import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import {
  isDowngrade,
  orderAmountPaise,
  toBillingCycle,
  toSubscriptionPlan,
} from '../../common/plans/plan-config';
import { PrismaService } from '../../prisma/prisma.service';
import { LifecycleOrchestratorService } from '../subscription-lifecycle/lifecycle-orchestrator.service';
import { SubscriptionInvoiceService } from '../subscription-lifecycle/subscription-invoice.service';
import { CreateOrderDto, VerifyPaymentDto } from './dto/billing.dto';
import { RazorpayService } from './razorpay.service';
import { SubscriptionService } from './subscription.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly razorpay: RazorpayService,
    private readonly subscriptions: SubscriptionService,
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleOrchestratorService,
    private readonly invoices: SubscriptionInvoiceService,
  ) {}

  @Public()
  @Post('create-order')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create Razorpay order for Pro/Plus checkout' })
  async createOrder(@Body() dto: CreateOrderDto) {
    if (!this.razorpay.isConfigured()) {
      throw new BadRequestException('Payment gateway is not configured');
    }
    const amountPaise = orderAmountPaise(dto.plan, dto.billing);
    const receipt = `rcpt_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    try {
      const order = await this.razorpay.createOrder({ amountPaise, receipt });
      await this.prisma.subscriptionPayment.create({
        data: {
          plan: toSubscriptionPlan(dto.plan),
          billingCycle: toBillingCycle(dto.billing),
          amountPaise,
          razorpayOrderId: order.orderId,
          status: 'created',
        },
      });
      return {
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        key_id: this.razorpay.keyId(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start payment';
      throw new BadRequestException(`Payment order failed: ${message}`);
    }
  }

  @Public()
  @Post('verify-payment')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = dto;
    if (!orderId || !paymentId || !signature) {
      throw new BadRequestException('Missing payment verification fields');
    }
  if (!this.razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
      throw new BadRequestException('Payment signature verification failed');
    }
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!payment) {
      throw new BadRequestException('Order not found');
    }
    const now = new Date();
    await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId: paymentId,
        status: 'paid',
        verifiedAt: now,
      },
    });
    return {
      ok: true,
      order_id: orderId,
      payment_id: paymentId,
      plan: payment.plan,
      billing_cycle: payment.billingCycle,
    };
  }

  @Get('subscription')
  @RequirePermission('billing:manage')
  @ApiOperation({ summary: 'Current organisation subscription snapshot' })
  async subscription(@CurrentUser() user: RequestUser) {
    const snap = await this.subscriptions.getSnapshotForUser(user);
    if (!snap) throw new BadRequestException('No organisation linked to this account');
    return snap;
  }

  @Post('upgrade')
  @RequirePermission('billing:manage')
  @HttpCode(200)
  @ApiOperation({ summary: 'Apply verified payment to current organisation' })
  async upgrade(@CurrentUser() user: RequestUser, @Body() dto: VerifyPaymentDto) {
    const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
    if (!companyId) throw new BadRequestException('No organisation linked to this account');
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = dto;
    if (!this.razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
      throw new UnauthorizedException('Payment signature verification failed');
    }
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!payment || payment.status !== 'paid') {
      throw new BadRequestException('Payment not verified');
    }
    if (payment.consumedAt && payment.companyId && payment.companyId !== companyId) {
      throw new BadRequestException('Payment already used by another organisation');
    }
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { subscriptionPlan: true, companyName: true },
    });
    if (!company) {
      throw new BadRequestException('Organisation not found');
    }
    if (isDowngrade(company.subscriptionPlan, payment.plan)) {
      throw new BadRequestException(
        `Downgrades are not allowed. Current plan: ${company.subscriptionPlan}, requested: ${payment.plan}.`,
      );
    }
    await this.subscriptions.activatePaidPlan({
      companyId,
      plan: payment.plan,
      billingCycle: payment.billingCycle,
      paymentId,
      orderId,
      amountPaise: payment.amountPaise,
    });

    const owner = await this.lifecycle.resolveOwnerEmail(companyId);
    if (owner) {
      void this.lifecycle.onSubscriptionActivated({
        companyId,
        ownerEmail: owner.email,
        companyName: company.companyName,
        plan: payment.plan,
        billingCycle: payment.billingCycle,
        amountPaise: payment.amountPaise,
        paymentId: payment.id,
      });
    }

    return this.subscriptions.getSnapshotForUser(user);
  }

  @Post('marketing-opt-out')
  @RequirePermission('billing:manage')
  @HttpCode(200)
  @ApiOperation({ summary: 'Opt out of platform marketing lifecycle emails' })
  async marketingOptOut(@CurrentUser() user: RequestUser) {
    const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
    if (!companyId) throw new BadRequestException('No organisation linked to this account');
    await this.prisma.company.update({
      where: { id: companyId },
      data: { platformMarketingOptOut: true },
    });
    return { ok: true };
  }

  @Get('invoices')
  @RequirePermission('billing:manage')
  @ApiOperation({ summary: 'List SaaS subscription invoices for current organisation' })
  async listInvoices(@CurrentUser() user: RequestUser) {
    const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
    if (!companyId) throw new BadRequestException('No organisation linked to this account');
    return this.invoices.listForCompany(companyId);
  }

  @Get('invoices/:id/pdf')
  @RequirePermission('billing:manage')
  @ApiOperation({ summary: 'Download SaaS subscription invoice PDF' })
  async downloadInvoicePdf(
    @CurrentUser() user: RequestUser,
    @Param('id') invoiceId: string,
    @Res() res: Response,
  ) {
    const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
    if (!companyId) throw new BadRequestException('No organisation linked to this account');
    const { buffer, filename } = await this.invoices.renderPdfBuffer(companyId, invoiceId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  }
}
