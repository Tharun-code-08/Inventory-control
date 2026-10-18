import {
  applyConsentAction,
  canMessageCustomer,
  parseConsentKeyword,
  reduceConsent,
  toDunningConsent,
} from './consent';

describe('parseConsentKeyword', () => {
  it('recognises opt-out keywords regardless of case/spacing', () => {
    expect(parseConsentKeyword('STOP')).toBe('OPT_OUT');
    expect(parseConsentKeyword(' stop ')).toBe('OPT_OUT');
    expect(parseConsentKeyword('Unsubscribe')).toBe('OPT_OUT');
    expect(parseConsentKeyword('opt out')).toBe('OPT_OUT'); // whitespace stripped
  });

  it('recognises opt-in keywords', () => {
    expect(parseConsentKeyword('START')).toBe('OPT_IN');
    expect(parseConsentKeyword('yes')).toBe('OPT_IN');
  });

  it('returns null for anything that is not a bare keyword', () => {
    expect(parseConsentKeyword('yes please keep sending')).toBeNull();
    expect(parseConsentKeyword('when is my invoice due?')).toBeNull();
    expect(parseConsentKeyword('')).toBeNull();
  });
});

describe('reduceConsent / applyConsentAction', () => {
  it('maps actions to absolute states', () => {
    expect(reduceConsent('OPT_IN')).toBe('OPTED_IN');
    expect(reduceConsent('OPT_OUT')).toBe('OPTED_OUT');
  });

  it('reports change + stamp only when the state actually moves', () => {
    expect(applyConsentAction('PENDING', 'OPT_IN')).toEqual({
      next: 'OPTED_IN',
      changed: true,
      stampConsentAt: true,
    });
    expect(applyConsentAction('OPTED_IN', 'OPT_IN')).toEqual({
      next: 'OPTED_IN',
      changed: false,
      stampConsentAt: false,
    });
    expect(applyConsentAction('OPTED_IN', 'OPT_OUT')).toMatchObject({
      next: 'OPTED_OUT',
      changed: true,
    });
  });
});

describe('canMessageCustomer', () => {
  it('permits only an explicit opt-in', () => {
    expect(canMessageCustomer('OPTED_IN')).toBe(true);
    expect(canMessageCustomer('PENDING')).toBe(false);
    expect(canMessageCustomer('OPTED_OUT')).toBe(false);
  });
});

describe('toDunningConsent', () => {
  it('flags a channel only when it is opted in', () => {
    expect(
      toDunningConsent([
        { channel: 'WHATSAPP', consentState: 'OPTED_IN' },
        { channel: 'EMAIL', consentState: 'PENDING' },
      ]),
    ).toEqual({ whatsapp: true, email: false });
  });

  it('defaults missing channels to not-consented', () => {
    expect(toDunningConsent([])).toEqual({ whatsapp: false, email: false });
    expect(toDunningConsent([{ channel: 'EMAIL', consentState: 'OPTED_IN' }])).toEqual({
      whatsapp: false,
      email: true,
    });
  });
});
