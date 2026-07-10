"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveEncryptionKey = deriveEncryptionKey;
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.sha256Hex = sha256Hex;
const crypto_1 = require("crypto");
function deriveEncryptionKey(secret, salt = 'retail-ims-backup-v1') {
    return (0, crypto_1.scryptSync)(secret, salt, 32);
}
function encryptSecret(secret, key) {
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}
function decryptSecret(payload, key) {
    const [ivRaw, tagRaw, encryptedRaw] = payload.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) {
        throw new Error('Invalid encrypted payload');
    }
    const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedRaw, 'base64url')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}
function sha256Hex(buffer) {
    return (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
}
//# sourceMappingURL=secret-crypto.js.map