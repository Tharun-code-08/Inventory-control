"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTraceparent = parseTraceparent;
const TRACEPARENT_RE = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;
const ZERO_TRACE = '0'.repeat(32);
const ZERO_SPAN = '0'.repeat(16);
function parseTraceparent(value) {
    if (!value)
        return null;
    const trimmed = String(value).trim();
    const m = TRACEPARENT_RE.exec(trimmed);
    if (!m)
        return null;
    const [, , traceId, parentId] = m;
    if (traceId.toLowerCase() === ZERO_TRACE || parentId.toLowerCase() === ZERO_SPAN) {
        return null;
    }
    return trimmed.toLowerCase();
}
//# sourceMappingURL=traceparent.js.map