"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRequestMetadata = auditRequestMetadata;
const request_context_1 = require("../context/request-context");
function auditRequestMetadata() {
    const ctx = request_context_1.RequestContextStore.get();
    return {
        requestId: ctx?.requestId ?? null,
        ipAddress: ctx?.ipAddress ?? null,
        userAgent: ctx?.userAgent ?? null,
    };
}
//# sourceMappingURL=audit-context.js.map