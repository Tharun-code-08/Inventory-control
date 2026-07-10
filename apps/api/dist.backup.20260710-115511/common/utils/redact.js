"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactSensitive = redactSensitive;
const SENSITIVE_KEY_RE = /(password|passwordhash|password_hash|token|tokenhash|token_hash|refresh|secret|csrf|apikey|api_key|authorization)/i;
const REDACTED = '[REDACTED]';
function redactSensitive(value) {
    return walk(value, new WeakSet());
}
function walk(value, seen) {
    if (value === null || value === undefined)
        return value;
    if (typeof value !== 'object')
        return value;
    if (seen.has(value))
        return undefined;
    seen.add(value);
    if (Array.isArray(value)) {
        return value.map((entry) => walk(entry, seen));
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
        if (SENSITIVE_KEY_RE.test(k)) {
            out[k] = REDACTED;
        }
        else {
            out[k] = walk(v, seen);
        }
    }
    return out;
}
//# sourceMappingURL=redact.js.map