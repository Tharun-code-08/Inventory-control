import type { NextFunction, Request, Response } from 'express';
export type RequestContextRequest = Request & {
    requestId?: string;
    traceparent?: string | null;
    user?: {
        id?: string;
        shopId?: string | null;
    };
};
export type RequestContextFinishHook = (info: {
    req: RequestContextRequest;
    res: Response;
    requestId: string;
    traceparent: string | null;
    startedAt: number;
    userId: string | null;
    shopId: string | null;
}) => void;
export declare function requestContextMiddleware(onFinish?: RequestContextFinishHook): (req: RequestContextRequest, res: Response, next: NextFunction) => void;
