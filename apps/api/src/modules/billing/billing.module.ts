import { Module, forwardRef } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { RazorpayService } from './razorpay.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionLifecycleModule } from '../subscription-lifecycle/subscription-lifecycle.module';

@Module({
  imports: [forwardRef(() => SubscriptionLifecycleModule)],
  controllers: [BillingController, BillingWebhookController],
  providers: [RazorpayService, SubscriptionService],
  exports: [RazorpayService, SubscriptionService],
})
export class BillingModule {}
