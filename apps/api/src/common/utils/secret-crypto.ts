import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';

export function deriveEncryptionKey(secret: string, salt = 'retail-ims-backup-v1') {
  return scryptSync(secret, salt, 32);
}

export function encryptSecret(secret: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload: string, key: Buffer) {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split('.');
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Invalid encrypted payload');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function sha256Hex(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}
