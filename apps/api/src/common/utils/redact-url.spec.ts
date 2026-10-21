import { redactUrl } from './redact-url';

describe('redactUrl', () => {
  it('masks long opaque path tokens but keeps UUIDs', () => {
    expect(redactUrl('/api/v1/quotation-portal/quotes/AbCdEf0123456789xyzQWERTY12/accept')).toBe(
      '/api/v1/quotation-portal/quotes/[redacted]/accept',
    );
    expect(redactUrl('/api/v1/products/0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(
      '/api/v1/products/0f8fad5b-d9cb-469f-a165-70867728950e',
    );
  });

  it('masks token-like query values', () => {
    expect(redactUrl('/api/v1/x?token=abc&page=2')).toBe('/api/v1/x?token=[redacted]&page=2');
  });
});
