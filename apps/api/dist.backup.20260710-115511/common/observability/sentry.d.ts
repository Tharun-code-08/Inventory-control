export declare function initSentry(): boolean;
export declare function isSentryEnabled(): boolean;
export declare function captureServerError(error: unknown, context?: {
    requestId?: string | null;
    route?: string | null;
    userId?: string | null;
}): void;
