import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const HKDF_SALT = Buffer.from('softdigit-smtp-credentials-v1');
const HKDF_INFO = Buffer.from('aes-256-gcm-key');

function deriveKey(secret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, HKDF_SALT, HKDF_INFO, 32));
}

function deriveKeyLegacy(secret: string): Buffer {
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
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  // Try HKDF-derived key first, then fall back to legacy SHA-256 for existing data
  for (const keyFn of [deriveKey, deriveKeyLegacy]) {
    try {
      const decipher = createDecipheriv(ALGORITHM, keyFn(secret), iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      continue;
    }
  }
  throw new Error('Decryption failed with all key derivation methods');
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
