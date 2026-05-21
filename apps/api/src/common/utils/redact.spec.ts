import { redactSensitive } from './redact';

describe('redactSensitive', () => {
  it('redacts top-level password/passwordHash/token/secret/csrf', () => {
    expect(redactSensitive({ password: 'p', secret: 's', other: 'o' })).toEqual({
      password: '[REDACTED]',
      secret: '[REDACTED]',
      other: 'o',
    });
  });

  it('redacts nested keys recursively', () => {
    expect(
      redactSensitive({
        user: { id: '1', passwordHash: 'h' },
        meta: { csrfToken: 't', deeper: { apiKey: 'k', kept: 'v' } },
      }),
    ).toEqual({
      user: { id: '1', passwordHash: '[REDACTED]' },
      meta: { csrfToken: '[REDACTED]', deeper: { apiKey: '[REDACTED]', kept: 'v' } },
    });
  });

  it('redacts inside arrays of objects', () => {
    expect(
      redactSensitive({ users: [{ id: '1', token: 't1' }, { id: '2', refresh_token: 't2' }] }),
    ).toEqual({
      users: [
        { id: '1', token: '[REDACTED]' },
        { id: '2', refresh_token: '[REDACTED]' },
      ],
    });
  });

  it('handles primitives and null without crashing', () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
    expect(redactSensitive('hello')).toBe('hello');
    expect(redactSensitive(42)).toBe(42);
  });

  it('does not mutate the input', () => {
    const input = { password: 'p', other: 'o' };
    const out = redactSensitive(input);
    expect(input.password).toBe('p');
    expect(out).not.toBe(input);
  });

  it('matches case-insensitively', () => {
    expect(redactSensitive({ Password: 'a', AUTHORIZATION: 'b' })).toEqual({
      Password: '[REDACTED]',
      AUTHORIZATION: '[REDACTED]',
    });
  });

  it('matches camelCase, snake_case, and PascalCase variants', () => {
    expect(
      redactSensitive({ apiKey: 'a', api_key: 'b', ApiKey: 'c', plain: 'p' }),
    ).toEqual({ apiKey: '[REDACTED]', api_key: '[REDACTED]', ApiKey: '[REDACTED]', plain: 'p' });
  });

  it('does not loop on cycles', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    const out = redactSensitive(obj) as Record<string, unknown>;
    expect(out.a).toBe(1);
    // The cycle is broken (set to undefined) — the test asserts no infinite loop.
    expect('self' in out).toBe(true);
  });
});
