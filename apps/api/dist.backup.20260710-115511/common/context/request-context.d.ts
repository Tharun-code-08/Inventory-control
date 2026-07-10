export type RequestContext = {
    requestId: string;
    traceparent?: string | null;
    userId?: string | null;
    shopId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
};
export declare const RequestContextStore: {
    run<T>(context: RequestContext, fn: () => T): T;
    get(): RequestContext | undefined;
    getRequestId(): string | undefined;
    patch(patch: Partial<RequestContext>): void;
};
