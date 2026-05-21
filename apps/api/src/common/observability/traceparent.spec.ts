import { parseTraceparent } from './traceparent';

const validTrace =
  '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01';

describe('parseTraceparent', () => {
  it('returns null for undefined/empty', () => {
    expect(parseTraceparent(undefined)).toBeNull();
    expect(parseTraceparent(null)).toBeNull();
    expect(parseTraceparent('')).toBeNull();
  });

  it('accepts a well-formed traceparent', () => {
    expect(parseTraceparent(validTrace)).toBe(validTrace);
  });

  it('normalises to lowercase', () => {
    expect(parseTraceparent(validTrace.toUpperCase())).toBe(validTrace);
  });

  it('rejects malformed strings', () => {
    expect(parseTraceparent('00-abc-def-01')).toBeNull();
    expect(parseTraceparent('not a trace id')).toBeNull();
  });

  it('rejects all-zero trace id', () => {
    expect(parseTraceparent('00-00000000000000000000000000000000-1234567890abcdef-01')).toBeNull();
  });

  it('rejects all-zero parent id', () => {
    expect(parseTraceparent('00-1234567890abcdef1234567890abcdef-0000000000000000-01')).toBeNull();
  });

  it('strips surrounding whitespace before validating', () => {
    expect(parseTraceparent(`   ${validTrace}   `)).toBe(validTrace);
  });
});
