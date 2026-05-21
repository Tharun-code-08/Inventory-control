import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, CsrfGuard } from './csrf.guard';

function fakeContext(request: Partial<Request>): ExecutionContext {
  const req = {
    headers: {},
    cookies: {},
    signedCookies: {},
    ...request,
  } as Partial<Request>;
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function configWith(originList: string) {
  return {
    get: (key: string, def?: string) => (key === 'WEB_ORIGIN' ? originList : def),
  } as unknown as ConfigService;
}

describe('CsrfGuard', () => {
  it('allows when cookie matches header and origin is allowed', () => {
    const guard = new CsrfGuard(configWith('http://localhost:5173'));
    const ctx = fakeContext({
      headers: { origin: 'http://localhost:5173', [CSRF_HEADER_NAME]: 'tok-123' },
      cookies: { [CSRF_COOKIE_NAME]: 'tok-123' },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects when origin is not in the allowlist', () => {
    const guard = new CsrfGuard(configWith('http://localhost:5173'));
    const ctx = fakeContext({
      headers: { origin: 'https://evil.example', [CSRF_HEADER_NAME]: 'tok-123' },
      cookies: { [CSRF_COOKIE_NAME]: 'tok-123' },
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects when CSRF cookie is missing', () => {
    const guard = new CsrfGuard(configWith('http://localhost:5173'));
    const ctx = fakeContext({
      headers: { origin: 'http://localhost:5173', [CSRF_HEADER_NAME]: 'tok-123' },
      cookies: {},
    });
    expect(() => guard.canActivate(ctx)).toThrow(/CSRF/);
  });

  it('rejects when header does not match cookie', () => {
    const guard = new CsrfGuard(configWith('http://localhost:5173'));
    const ctx = fakeContext({
      headers: { origin: 'http://localhost:5173', [CSRF_HEADER_NAME]: 'wrong' },
      cookies: { [CSRF_COOKIE_NAME]: 'tok-123' },
    });
    expect(() => guard.canActivate(ctx)).toThrow(/Invalid CSRF/);
  });

  it('allows non-browser callers (no Origin/Referer)', () => {
    const guard = new CsrfGuard(configWith('http://localhost:5173'));
    const ctx = fakeContext({
      headers: { [CSRF_HEADER_NAME]: 'tok-123' },
      cookies: { [CSRF_COOKIE_NAME]: 'tok-123' },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
