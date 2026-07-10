"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDecision = parseDecision;
const APPROVE_RE = /^(?:approve|approved|yes|confirm|confirmed|ok|okay|sure|proceed|go ahead|do it|👍|✅)(?:\s+(?:it|that|task))?(?:\s*#?\d+)?\s*[.!]*$/i;
const REJECT_RE = /^(?:reject|rejected|no|cancel|cancelled|canceled|stop|discard|dismiss|never mind|nevermind|❌)(?:\s+(?:it|that|task))?(?:\s*#?\d+)?\s*[.!]*$/i;
function parseDecision(text) {
    const trimmed = (text ?? '').trim();
    if (!trimmed)
        return null;
    if (APPROVE_RE.test(trimmed))
        return 'approve';
    if (REJECT_RE.test(trimmed))
        return 'reject';
    return null;
}
//# sourceMappingURL=approval.js.map