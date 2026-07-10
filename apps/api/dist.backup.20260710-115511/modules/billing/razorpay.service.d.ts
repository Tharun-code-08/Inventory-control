import { ConfigService } from '@nestjs/config';
export declare class RazorpayService {
    private readonly config;
    private readonly logger;
    private client;
    constructor(config: ConfigService);
    isConfigured(): boolean;
    keyId(): string | undefined;
    private keySecret;
    private getClient;
    createOrder(args: {
        amountPaise: number;
        receipt: string;
        currency?: string;
    }): Promise<{
        orderId: string;
        amount: number;
        currency: string;
    }>;
    verifyPaymentSignature(args: {
        orderId: string;
        paymentId: string;
        signature: string;
    }): boolean;
    verifyWebhookSignature(body: string | Buffer, signature: string): boolean;
    createSubscription(_args: {
        planId: string;
        customerId?: string;
        totalCount?: number;
    }): Promise<{
        subscriptionId: string;
    } | null>;
}
