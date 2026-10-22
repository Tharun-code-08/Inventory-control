import type { BillingCycle, SubscriptionPlan } from '@prisma/client';
import type { LifecycleOrchestratorService } from '../subscription-lifecycle/lifecycle-orchestrator.service';

/** Sends the "plan activated" email and invoice to the organisation owner (fire-and-forget). */
export async function notifySubscriptionActivated(
  lifecycle: LifecycleOrchestratorService,
  companyId: string,
  payment: { id: string; plan: SubscriptionPlan; billingCycle: BillingCycle; amountPaise: number },
): Promise<void> {
  const owner = await lifecycle.resolveOwnerEmail(companyId);
  if (!owner) return;
  void lifecycle.onSubscriptionActivated({
    companyId,
    ownerEmail: owner.email,
    companyName: owner.companyName,
    plan: payment.plan,
    billingCycle: payment.billingCycle,
    amountPaise: payment.amountPaise,
    paymentId: payment.id,
  });
}
