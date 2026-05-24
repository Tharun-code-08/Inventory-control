import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

type RazorpayClient = {
  orders: {
    create: (args: {
      amount: number;
      currency: string;
      receipt: string;
    }) => Promise<{ id: string; amount: number; currency: string }>;
  };
};

type RazorpayCtor = new (config: { key_id: string; key_secret: string }) => RazorpayClient;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay') as RazorpayCtor;

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private client: RazorpayClient | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.keyId() && this.keySecret());
  }

  keyId(): string | undefined {
    return this.config.get<string>('RAZORPAY_KEY_ID')?.trim() || undefined;
  }

  private keySecret(): string | undefined {
    return this.config.get<string>('RAZORPAY_KEY_SECRET')?.trim() || undefined;
  }

  private getClient(): RazorpayClient {
    const keyId = this.keyId();
    const keySecret = this.keySecret();
    if (!keyId || !keySecret) {
      throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
    if (!this.client) {
      this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return this.client;
  }

  async createOrder(args: { amountPaise: number; receipt: string; currency?: string }) {
    if (args.amountPaise < 100) {
      throw new Error('Amount must be at least 100 paise');
    }
    const client = this.getClient();
    try {
      const order = await client.orders.create({
        amount: args.amountPaise,
        currency: args.currency ?? 'INR',
        receipt: args.receipt,
      });
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (err) {
      this.logger.error(`Razorpay create order failed: ${(err as Error).message}`);
      throw err;
    }
  }

  verifyPaymentSignature(args: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const secret = this.keySecret();
    if (!secret) return false;
    const body = `${args.orderId}|${args.paymentId}`;
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    return expected === args.signature;
  }
}
