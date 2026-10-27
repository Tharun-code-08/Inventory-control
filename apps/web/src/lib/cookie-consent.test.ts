import { describe, expect, it } from 'vitest';
import { DEFAULT_COOKIE_CONSENT, nextCookieConsent, parseCookieConsent } from './cookie-consent';

describe('cookie consent preferences', () => {
  it('does not infer analytics consent from legacy functional consent', () => {
    expect(parseCookieConsent('{"functional":true,"decided":true}')).toMatchObject({
      essential: true,
      functional: true,
      analytics: false,
      decided: true,
    });
  });

  it('defaults analytics and functional consent to off', () => {
    expect(DEFAULT_COOKIE_CONSENT).toMatchObject({ functional: false, analytics: false });
  });

  it('does not interpret non-boolean stored values as consent', () => {
    expect(parseCookieConsent('{"functional":"true","analytics":1,"decided":"yes"}')).toMatchObject({
      functional: false,
      analytics: false,
      decided: false,
    });
  });

  it('stores functional and analytics choices independently', () => {
    expect(nextCookieConsent(true, false)).toMatchObject({
      functional: true,
      analytics: false,
      decided: true,
    });
  });
});
