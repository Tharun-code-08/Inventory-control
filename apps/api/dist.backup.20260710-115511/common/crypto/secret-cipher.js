"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.getSmtpCredentialsKey = getSmtpCredentialsKey;
const crypto_1 = require("crypto");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
function deriveKey(secret) {
    return (0, crypto_1.createHash)('sha256').update(secret).digest();
}
function encryptSecret(plaintext, secret) {
    const key = deriveKey(secret);
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}
function decryptSecret(payload, secret) {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
        throw new Error('Invalid encrypted secret format');
    }
    const key = deriveKey(secret);
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}
function getSmtpCredentialsKey() {
    const key = process.env.SMTP_CREDENTIALS_KEY?.trim() ||
        process.env.APP_SECRET?.trim() ||
        process.env.JWT_SECRET?.trim();
    if (!key) {
        throw new Error('SMTP_CREDENTIALS_KEY (or APP_SECRET) must be set to store sender SMTP passwords');
    }
    return key;
}
//# sourceMappingURL=secret-cipher.js.map