import {
  SendWindowConfig,
  isQuietHour,
  nextPreferredSendTime,
  resolveSendDecision,
} from './send-window';

// IST business, quiet 22:00–08:00 local.
const IST: SendWindowConfig = {
  businessUtcOffsetMinutes: 330,
  quietStartHour: 22,
  quietEndHour: 8,
};

describe('isQuietHour', () => {
  it('handles a window that wraps midnight (22→8)', () => {
    expect(isQuietHour(23, 22, 8)).toBe(true);
    expect(isQuietHour(2, 22, 8)).toBe(true);
    expect(isQuietHour(8, 22, 8)).toBe(false); // end is exclusive
    expect(isQuietHour(12, 22, 8)).toBe(false);
  });

  it('handles a same-day window (1→5)', () => {
    expect(isQuietHour(3, 1, 5)).toBe(true);
    expect(isQuietHour(6, 1, 5)).toBe(false);
  });

  it('treats equal bounds as no quiet window', () => {
    expect(isQuietHour(3, 0, 0)).toBe(false);
  });
});

describe('resolveSendDecision', () => {
  it('sends during the day (11:30 IST)', () => {
    // 06:00Z + 5:30 = 11:30 IST
    const d = resolveSendDecision({
      now: new Date('2026-07-30T06:00:00.000Z'),
      config: IST,
      priority: 'NORMAL',
    });
    expect(d.sendNow).toBe(true);
    expect(d.deferUntil).toBeNull();
  });

  it('defers a night send to the next 08:00 local', () => {
    // 18:00Z + 5:30 = 23:30 IST (quiet) → defer to 2026-07-31 08:00 IST = 02:30Z
    const d = resolveSendDecision({
      now: new Date('2026-07-30T18:00:00.000Z'),
      config: IST,
      priority: 'NORMAL',
    });
    expect(d.sendNow).toBe(false);
    expect(d.deferUntil?.toISOString()).toBe('2026-07-31T02:30:00.000Z');
  });

  it('defers an early-morning send to 08:00 the same local day', () => {
    // 01:00Z + 5:30 = 06:30 IST (quiet, before 08) → defer to same-day 08:00 IST = 02:30Z
    const d = resolveSendDecision({
      now: new Date('2026-07-30T01:00:00.000Z'),
      config: IST,
      priority: 'NORMAL',
    });
    expect(d.deferUntil?.toISOString()).toBe('2026-07-30T02:30:00.000Z');
  });

  it('lets CRITICAL priority bypass quiet hours', () => {
    const d = resolveSendDecision({
      now: new Date('2026-07-30T18:00:00.000Z'),
      config: IST,
      priority: 'CRITICAL',
    });
    expect(d.sendNow).toBe(true);
    expect(d.reason).toMatch(/bypass/i);
  });
});

describe('nextPreferredSendTime', () => {
  it('returns the next local preferred hour as UTC, or null when unset', () => {
    expect(nextPreferredSendTime(new Date('2026-07-30T06:00:00.000Z'), IST)).toBeNull();
    // preferred 09:00 IST; now 11:30 IST already past → next day 09:00 IST = 03:30Z
    const cfg: SendWindowConfig = { ...IST, preferredSendHour: 9 };
    expect(
      nextPreferredSendTime(new Date('2026-07-30T06:00:00.000Z'), cfg)?.toISOString(),
    ).toBe('2026-07-31T03:30:00.000Z');
  });
});
