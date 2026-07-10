"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSentry = initSentry;
exports.isSentryEnabled = isSentryEnabled;
exports.captureServerError = captureServerError;
const common_1 = require("@nestjs/common");
const Sentry = require("@sentry/node");
let initialized = false;
function initSentry() {
    if (initialized)
        return true;
    const dsn = process.env.SENTRY_DSN?.trim();
    if (!dsn)
        return false;
    Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
        release: process.env.SENTRY_RELEASE ?? undefined,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
    });
    initialized = true;
    new common_1.Logger('Sentry').log('Sentry initialized');
    return true;
}
function isSentryEnabled() {
    return initialized;
}
function captureServerError(error, context = {}) {
    if (!initialized)
        return;
    Sentry.withScope((scope) => {
        if (context.requestId)
            scope.setTag('request_id', context.requestId);
        if (context.route)
            scope.setTag('route', context.route);
        if (context.userId)
            scope.setUser({ id: context.userId });
        Sentry.captureException(error);
    });
}
//# sourceMappingURL=sentry.js.map