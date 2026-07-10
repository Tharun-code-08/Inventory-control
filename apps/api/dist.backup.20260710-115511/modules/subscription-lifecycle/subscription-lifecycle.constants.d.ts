export declare const SUBSCRIPTION_LIFECYCLE_QUEUE = "subscription-lifecycle";
export declare const SOFTDIGIT_PLATFORM: {
    readonly gstNumber: string;
    readonly companyName: "Softdigit Consulting";
    readonly email: "office@softdigitconsulting.com";
};
export declare function platformWebBaseUrl(configured?: string | null): string;
export declare function trackedUrl(baseUrl: string, logId: string, targetUrl: string): string;
export declare function marketingUnsubscribeUrl(baseUrl: string, companyId: string): string;
