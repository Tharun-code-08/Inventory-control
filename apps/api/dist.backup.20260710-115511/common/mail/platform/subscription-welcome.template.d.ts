export type SubscriptionWelcomeContext = {
    companyName: string;
    planName: string;
    billingCycle: string;
    amountDisplay: string;
    loginUrl: string;
    invoiceNumber?: string;
};
export declare function subscriptionWelcomeSubject(ctx: SubscriptionWelcomeContext): string;
export declare function subscriptionWelcomeText(ctx: SubscriptionWelcomeContext): string;
export declare function subscriptionWelcomeHtml(ctx: SubscriptionWelcomeContext): string;
