"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBarcode = normalizeBarcode;
const MAX_BARCODE_LENGTH = 255;
const CONTROL_AND_ZERO_WIDTH = new RegExp('[\\u0000-\\u001f\\u007f\\u200b-\\u200d\\ufeff]', 'g');
function normalizeBarcode(raw) {
    const cleaned = raw.normalize('NFKC').replace(CONTROL_AND_ZERO_WIDTH, '').trim();
    if (cleaned.length === 0 || cleaned.length > MAX_BARCODE_LENGTH) {
        return null;
    }
    return cleaned;
}
//# sourceMappingURL=barcode-normalize.js.map