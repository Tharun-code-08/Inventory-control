import { createHmac } from 'crypto';
import { verifyMetaSignature } from './whatsapp-signature.util';

const SECRET = 'test-app-secret';
const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }));

function sign(buf: Buffer, secret: string = SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(buf).digest('hex');
}

describe('verifyMetaSignature', () => {
  it('accepts a valid signature', () => {
    expect(verifyMetaSignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a signature produced with a different secret', () => {
    expect(verifyMetaSignature(body, sign(body, 'other-secret'), SECRET)).toBe(false);
  });

  it('rejects when the body was tampered with after signing', () => {
    const tampered = Buffer.from(body.toString('utf8').replace('entry', 'ENTRY'));
    expect(verifyMetaSignature(tampered, sign(body), SECRET)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(verifyMetaSignature(body, undefined, SECRET)).toBe(false);
    expect(verifyMetaSignature(body, '', SECRET)).toBe(false);
  });

  it('rejects when no app secret is configured', () => {
    expect(verifyMetaSignature(body, sign(body), '')).toBe(false);
  });

  it('rejects a header without the sha256= prefix', () => {
    const bare = createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyMetaSignature(body, bare, SECRET)).toBe(false);
  });

  it('rejects malformed or truncated hex digests', () => {
    expect(verifyMetaSignature(body, 'sha256=', SECRET)).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=abcd', SECRET)).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=zzzz', SECRET)).toBe(false);
  });
});
