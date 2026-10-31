import { createHmac, timingSafeEqual } from 'crypto';

export type SupplierPortalClaims = { rfqId: string; supplierId: string; expiresAt: number };

function portalSecret(): string {
  const secret = process.env.SUPPLIER_PORTAL_SECRET?.trim();
  if (!secret) throw new Error('SUPPLIER_PORTAL_SECRET must be set for supplier portal links (do not reuse JWT_SECRET)');
  return secret;
}

function sign(body: string): string {
  return createHmac('sha256', portalSecret()).update(`supplier-portal:${body}`).digest('base64url');
}

/** A link token that lets one supplier view and quote on one RFQ until it expires. */
export function signSupplierPortalToken(claims: SupplierPortalClaims): string {
  const body = Buffer.from(JSON.stringify({ r: claims.rfqId, s: claims.supplierId, e: claims.expiresAt })).toString(
    'base64url',
  );
  return `${body}.${sign(body)}`;
}

/** Returns the claims of a valid, unexpired token, or null. */
export function verifySupplierPortalToken(token: string, now = Date.now()): SupplierPortalClaims | null {
  const [body, mac, extra] = (token ?? '').trim().split('.');
  if (!body || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { r?: unknown; s?: unknown; e?: unknown };
    if (typeof parsed.r !== 'string' || typeof parsed.s !== 'string' || typeof parsed.e !== 'number') return null;
    if (parsed.e < now) return null;
    return { rfqId: parsed.r, supplierId: parsed.s, expiresAt: parsed.e };
  } catch {
    return null;
  }
}

/** Links stay valid until a day after the RFQ deadline, or 30 days when there is none. */
export function supplierPortalTokenExpiry(deadline: Date | null | undefined, now = Date.now()): number {
  const DAY = 24 * 60 * 60 * 1000;
  if (deadline) return Math.max(new Date(deadline).getTime() + 2 * DAY, now + DAY);
  return now + 30 * DAY;
}
