import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string, secret: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret format');
  }
  const key = deriveKey(secret);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * Key that new SMTP passwords are encrypted with. Set SMTP_CREDENTIALS_KEY so
 * stored passwords don't depend on the JWT secret.
 */
export function getSmtpCredentialsKey(): string {
  const key =
    process.env.SMTP_CREDENTIALS_KEY?.trim() ||
    process.env.APP_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  if (!key) {
    throw new Error('SMTP_CREDENTIALS_KEY (or APP_SECRET) must be set to store sender SMTP passwords');
  }
  return key;
}

/**
 * Every key a stored SMTP password may be encrypted with, current key first:
 * SMTP_CREDENTIALS_KEY_PREVIOUS (after a rotation), then the APP_SECRET and
 * JWT_SECRET fallbacks used before a dedicated key was set.
 */
export function getSmtpCredentialsKeys(): string[] {
  const keys = [
    getSmtpCredentialsKey(),
    process.env.SMTP_CREDENTIALS_KEY_PREVIOUS?.trim(),
    process.env.APP_SECRET?.trim(),
    process.env.JWT_SECRET?.trim(),
  ].filter((key): key is string => !!key);
  return [...new Set(keys)];
}

/** Decrypts with the first key that works; `keyIndex` 0 means the current key. */
export function decryptSecretWithKeys(
  payload: string,
  keys: readonly string[],
): { plaintext: string; keyIndex: number } {
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    try {
      return { plaintext: decryptSecret(payload, keys[keyIndex]), keyIndex };
    } catch {
      // try the next key
    }
  }
  throw new Error('Encrypted secret could not be decrypted with any configured key');
}
