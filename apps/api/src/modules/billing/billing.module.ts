import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { RazorpayService } from './razorpay.service';
import { SubscriptionService } from './subscription.service';

@Module({
  controllers: [BillingController],
  providers: [RazorpayService, SubscriptionService],
  exports: [RazorpayService, SubscriptionService],
})
export class BillingModule {}
