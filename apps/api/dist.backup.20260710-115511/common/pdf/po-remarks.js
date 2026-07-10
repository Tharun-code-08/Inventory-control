"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePoRemarks = parsePoRemarks;
const MARKER = '<!--PO_DOCUMENT:';
const MARKER_END = '-->';
function parsePoRemarks(remarks) {
    if (!remarks?.trim()) {
        return { humanRemarks: '', document: {} };
    }
    const idx = remarks.indexOf(MARKER);
    if (idx === -1) {
        return { humanRemarks: remarks.trim(), document: {} };
    }
    const humanRemarks = remarks.slice(0, idx).trim();
    const jsonPart = remarks.slice(idx + MARKER.length);
    const end = jsonPart.lastIndexOf(MARKER_END);
    const raw = end >= 0 ? jsonPart.slice(0, end) : jsonPart;
    try {
        return { humanRemarks, document: JSON.parse(raw) };
    }
    catch {
        return { humanRemarks: remarks.trim(), document: {} };
    }
}
//# sourceMappingURL=po-remarks.js.map