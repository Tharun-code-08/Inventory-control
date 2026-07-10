export declare class CreateOrderDto {
    plan: 'pro' | 'plus';
    billing: 'monthly' | 'yearly';
}
export declare class VerifyPaymentDto {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}
