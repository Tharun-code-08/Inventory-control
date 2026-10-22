import { BillingCycle, SubscriptionPlan } from '@prisma/client';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService.applyBoundPayment', () => {
  function setup(payment: Record<string, unknown> | null) {
    const prisma = {
      subscriptionPayment: { findUnique: jest.fn().mockResolvedValue(payment) },
    } as any;
    const service = new SubscriptionService(prisma);
    const activate = jest.spyOn(service, 'activatePaidPlan').mockResolvedValue(undefined);
    return { service, activate };
  }

  const paid = {
    companyId: 'c1',
    status: 'paid',
    consumedAt: null,
    plan: SubscriptionPlan.PRO,
    billingCycle: BillingCycle.MONTHLY,
    amountPaise: 99900,
  };

  it('activates the plan for the organisation the order was created for', async () => {
    const { service, activate } = setup(paid);
    await expect(service.applyBoundPayment('order_1', 'pay_1')).resolves.toBe('c1');
    expect(activate).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'c1', orderId: 'order_1', paymentId: 'pay_1', plan: SubscriptionPlan.PRO }),
    );
  });

  it.each([
    ['unbound (signup) orders', { ...paid, companyId: null }],
    ['already consumed orders', { ...paid, consumedAt: new Date() }],
    ['unpaid orders', { ...paid, status: 'created' }],
    ['unknown orders', null],
  ])('leaves %s alone', async (_label, payment) => {
    const { service, activate } = setup(payment);
    await expect(service.applyBoundPayment('order_1', 'pay_1')).resolves.toBeNull();
    expect(activate).not.toHaveBeenCalled();
  });

  it('returns null when a concurrent request already applied it', async () => {
    const { service, activate } = setup(paid);
    const { BadRequestException } = require('@nestjs/common');
    activate.mockRejectedValue(new BadRequestException('Payment already consumed by a concurrent request'));
    await expect(service.applyBoundPayment('order_1', 'pay_1')).resolves.toBeNull();
  });
});
