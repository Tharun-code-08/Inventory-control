import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify Meta's `X-Hub-Signature-256` webhook header against the raw request
 * body. Constant-time comparison; returns false on any malformed input.
 */
export function verifyMetaSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) return false;

  const given = Buffer.from(signatureHeader.slice(prefix.length), 'hex');
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  if (given.length !== expected.length || given.length === 0) return false;
  return timingSafeEqual(given, expected);
}
