import {
  EMPTY_ENGAGEMENT,
  applyEngagementSignal,
  computeReliabilityScore,
  preferredChannel,
  preferredSendHour,
} from './engagement';

describe('applyEngagementSignal', () => {
  it('increments the matching counter immutably', () => {
    const s = applyEngagementSignal(EMPTY_ENGAGEMENT, 'OPENED');
    expect(s.opens).toBe(1);
    expect(EMPTY_ENGAGEMENT.opens).toBe(0); // original untouched
  });

  it('tallies channel signals only for positive signals', () => {
    let s = applyEngagementSignal(EMPTY_ENGAGEMENT, 'CLICKED', 'WHATSAPP');
    s = applyEngagementSignal(s, 'IGNORED', 'WHATSAPP'); // negative → no channel tally
    expect(s.whatsappSignals).toBe(1);
    expect(s.ignored).toBe(1);
  });
});

describe('computeReliabilityScore', () => {
  it('is 50 for an empty snapshot', () => {
    expect(computeReliabilityScore(EMPTY_ENGAGEMENT)).toBe(50);
  });

  it('rises with positive engagement and clamps at 100', () => {
    const s = { ...EMPTY_ENGAGEMENT, paidCount: 3, clicks: 5 }; // 50+90+50 → 100
    expect(computeReliabilityScore(s)).toBe(100);
  });

  it('a block floors the score at 0', () => {
    expect(computeReliabilityScore({ ...EMPTY_ENGAGEMENT, blocked: 1 })).toBe(0);
  });

  it('is order-independent (recomputed from counters)', () => {
    const a = applyEngagementSignal(applyEngagementSignal(EMPTY_ENGAGEMENT, 'OPENED'), 'PAID');
    const b = applyEngagementSignal(applyEngagementSignal(EMPTY_ENGAGEMENT, 'PAID'), 'OPENED');
    expect(computeReliabilityScore(a)).toBe(computeReliabilityScore(b));
  });
});

describe('preferredChannel', () => {
  it('picks the more-engaged channel, null on a tie', () => {
    expect(preferredChannel({ ...EMPTY_ENGAGEMENT, whatsappSignals: 3, emailSignals: 1 })).toBe(
      'WHATSAPP',
    );
    expect(preferredChannel({ ...EMPTY_ENGAGEMENT, whatsappSignals: 2, emailSignals: 2 })).toBeNull();
    expect(preferredChannel(EMPTY_ENGAGEMENT)).toBeNull();
  });
});

describe('preferredSendHour', () => {
  it('returns the modal engagement hour', () => {
    expect(preferredSendHour([9, 9, 14, 9, 20])).toBe(9);
  });

  it('breaks ties toward the earliest hour', () => {
    expect(preferredSendHour([20, 8])).toBe(8);
  });

  it('returns null with no data', () => {
    expect(preferredSendHour([])).toBeNull();
  });
});
