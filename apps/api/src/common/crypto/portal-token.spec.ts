import { signSupplierPortalToken, supplierPortalTokenExpiry, verifySupplierPortalToken } from './portal-token';

describe('supplier portal token', () => {
  const saved = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = 'portal-test-secret';
  });
  afterAll(() => {
    process.env.JWT_SECRET = saved;
  });

  const claims = { rfqId: 'rfq-1', supplierId: 'sup-1', expiresAt: Date.now() + 60_000 };

  it('round-trips valid claims', () => {
    expect(verifySupplierPortalToken(signSupplierPortalToken(claims))).toEqual(claims);
  });

  it('rejects tampered, expired and malformed tokens', () => {
    const token = signSupplierPortalToken(claims);
    const [body, mac] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ r: 'rfq-1', s: 'other', e: claims.expiresAt })).toString('base64url');
    expect(verifySupplierPortalToken(`${forged}.${mac}`)).toBeNull();
    expect(verifySupplierPortalToken(`${body}.${mac}x`)).toBeNull();
    expect(verifySupplierPortalToken(signSupplierPortalToken({ ...claims, expiresAt: Date.now() - 1 }))).toBeNull();
    expect(verifySupplierPortalToken('')).toBeNull();
    expect(verifySupplierPortalToken('a.b.c')).toBeNull();
  });

  it('rejects tokens signed with another secret', () => {
    const token = signSupplierPortalToken(claims);
    process.env.JWT_SECRET = 'rotated';
    expect(verifySupplierPortalToken(token)).toBeNull();
    process.env.JWT_SECRET = 'portal-test-secret';
  });

  it('expires after the deadline, or in 30 days without one', () => {
    const now = Date.parse('2026-10-01T00:00:00Z');
    expect(supplierPortalTokenExpiry(new Date('2026-10-10T00:00:00Z'), now)).toBe(Date.parse('2026-10-12T00:00:00Z'));
    expect(supplierPortalTokenExpiry(null, now)).toBe(now + 30 * 86_400_000);
  });
});
