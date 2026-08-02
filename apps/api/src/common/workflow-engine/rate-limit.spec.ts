import {
  RateCaps,
  RateCounts,
  firstAllowedChannel,
  isUnderCap,
  rateLimitDecision,
} from './rate-limit';

const caps: RateCaps = { whatsappPerDay: 2, emailPerDay: 3 };

describe('isUnderCap', () => {
  it('respects per-channel caps', () => {
    expect(isUnderCap('WHATSAPP', { whatsapp: 1, email: 0 }, caps)).toBe(true);
    expect(isUnderCap('WHATSAPP', { whatsapp: 2, email: 0 }, caps)).toBe(false);
  });

  it('treats an unset cap as unlimited', () => {
    expect(isUnderCap('WHATSAPP', { whatsapp: 99, email: 0 }, {})).toBe(true);
  });

  it('never caps IN_APP', () => {
    expect(isUnderCap('IN_APP', { whatsapp: 0, email: 0 }, caps)).toBe(true);
  });
});

describe('firstAllowedChannel / rateLimitDecision', () => {
  const order: ('WHATSAPP' | 'EMAIL')[] = ['WHATSAPP', 'EMAIL'];

  it('picks the preferred channel when it is under cap', () => {
    const d = rateLimitDecision({ channelOrder: order, counts: { whatsapp: 0, email: 0 }, caps });
    expect(d.channel).toBe('WHATSAPP');
    expect(d.cappedChannels).toEqual([]);
  });

  it('falls back to email when WhatsApp is capped', () => {
    const counts: RateCounts = { whatsapp: 2, email: 1 };
    const d = rateLimitDecision({ channelOrder: order, counts, caps });
    expect(d.channel).toBe('EMAIL');
    expect(d.cappedChannels).toEqual(['WHATSAPP']);
  });

  it('returns null (→ digest) when every candidate is capped', () => {
    const counts: RateCounts = { whatsapp: 2, email: 3 };
    const d = rateLimitDecision({ channelOrder: order, counts, caps });
    expect(d.channel).toBeNull();
    expect(d.cappedChannels).toEqual(['WHATSAPP', 'EMAIL']);
    expect(d.reason).toMatch(/digest/i);
  });

  it('firstAllowedChannel walks the order', () => {
    expect(firstAllowedChannel(order, { whatsapp: 2, email: 0 }, caps)).toBe('EMAIL');
  });
});
