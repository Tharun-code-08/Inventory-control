"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMetaSignature = verifyMetaSignature;
const crypto_1 = require("crypto");
function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
    if (!signatureHeader || !appSecret)
        return false;
    const prefix = 'sha256=';
    if (!signatureHeader.startsWith(prefix))
        return false;
    const given = Buffer.from(signatureHeader.slice(prefix.length), 'hex');
    const expected = (0, crypto_1.createHmac)('sha256', appSecret).update(rawBody).digest();
    if (given.length !== expected.length || given.length === 0)
        return false;
    return (0, crypto_1.timingSafeEqual)(given, expected);
}
//# sourceMappingURL=whatsapp-signature.util.js.map