import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RazorpayService } from './razorpay.service';

function makeService(env: Record<string, string>) {
  const config = { get: jest.fn((key: string) => env[key]) } as unknown as ConfigService;
  return new RazorpayService(config);
}

const sign = (secret: string, body: string) => createHmac('sha256', secret).update(body).digest('hex');

describe('RazorpayService signature verification', () => {
  const service = makeService({
    RAZORPAY_KEY_SECRET: 'key-secret',
    RAZORPAY_WEBHOOK_SECRET: 'hook-secret',
  });

  it('accepts a valid payment signature', () => {
    const signature = sign('key-secret', 'order_1|pay_1');
    expect(service.verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature })).toBe(true);
  });

  it('rejects a tampered, truncated or empty payment signature', () => {
    const signature = sign('key-secret', 'order_1|pay_1');
    const flipped = (signature[0] === 'a' ? 'b' : 'a') + signature.slice(1);
    for (const bad of [flipped, signature.slice(0, -2), '']) {
      expect(service.verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: bad })).toBe(false);
    }
  });

  it('accepts a valid webhook signature and rejects a wrong one', () => {
    const body = '{"event":"payment.captured"}';
    expect(service.verifyWebhookSignature(body, sign('hook-secret', body))).toBe(true);
    expect(service.verifyWebhookSignature(body, sign('other-secret', body))).toBe(false);
  });

  it('fails closed when no secret is configured', () => {
    const unconfigured = makeService({});
    expect(
      unconfigured.verifyPaymentSignature({ orderId: 'o', paymentId: 'p', signature: sign('', 'o|p') }),
    ).toBe(false);
  });
});
