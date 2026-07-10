"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asBrandingSnapshot = asBrandingSnapshot;
exports.asBrandingSnapshotOrNull = asBrandingSnapshotOrNull;
function asBrandingSnapshot(value) {
    if (!value) {
        throw new Error('Cannot cast null/undefined to BrandingSnapshotV1');
    }
    return value;
}
function asBrandingSnapshotOrNull(value) {
    if (!value)
        return null;
    return value;
}
//# sourceMappingURL=branding.utils.js.map