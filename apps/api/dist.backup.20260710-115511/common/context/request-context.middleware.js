"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContextMiddleware = requestContextMiddleware;
const node_crypto_1 = require("node:crypto");
const request_context_1 = require("./request-context");
const traceparent_1 = require("../observability/traceparent");
function requestContextMiddleware(onFinish) {
    return (req, res, next) => {
        const requestId = String(req.headers['x-request-id'] ?? (0, node_crypto_1.randomUUID)());
        const traceparent = (0, traceparent_1.parseTraceparent)(req.headers['traceparent']);
        const forwardedFor = req.headers['x-forwarded-for'];
        const ipAddress = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
            req.ip ||
            req.socket.remoteAddress ||
            null;
        const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
        req.requestId = requestId;
        req.traceparent = traceparent;
        res.setHeader('x-request-id', requestId);
        if (traceparent) {
            res.setHeader('traceparent', traceparent);
        }
        const startedAt = Date.now();
        request_context_1.RequestContextStore.run({ requestId, traceparent, userId: null, shopId: null, ipAddress, userAgent }, () => {
            res.on('finish', () => {
                const userId = req.user?.id ?? null;
                const shopId = req.user?.shopId ?? null;
                request_context_1.RequestContextStore.patch({ userId, shopId });
                onFinish?.({ req, res, requestId, traceparent, startedAt, userId, shopId });
            });
            next();
        });
    };
}
//# sourceMappingURL=request-context.middleware.js.map