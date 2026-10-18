import { resolveChannel, ChannelRouterInput } from './channel-router';
import { EMPTY_ENGAGEMENT } from '../engagement';

const baseWindow = { businessUtcOffsetMinutes: 330, quietStartHour: 21, quietEndHour: 8 };

function input(over: Partial<ChannelRouterInput> = {}): ChannelRouterInput {
  return {
    consent: { whatsapp: true, email: true },
    counts: { whatsapp: 0, email: 0 },
    caps: { whatsappPerDay: 2, emailPerDay: 5 },
    now: new Date('2026-01-01T09:00:00Z'), // 14:30 IST — within window
    sendWindow: baseWindow,
    priority: 'NORMAL',
    ...over,
  };
}

describe('resolveChannel', () => {
  it('returns null when there is no consent and no in-app', () => {
    const d = resolveChannel(input({ consent: { whatsapp: false, email: false } }));
    expect(d.channel).toBeNull();
  });

  it('prefers WhatsApp by default fallback order', () => {
    const d = resolveChannel(input());
    expect(d.channel).toBe('WHATSAPP');
    expect(d.sendNow).toBe(true);
  });

  it('honours engagement-preferred channel', () => {
    const engagement = { ...EMPTY_ENGAGEMENT, emailSignals: 5, whatsappSignals: 0 };
    const d = resolveChannel(input({ engagement }));
    expect(d.order[0]).toBe('EMAIL');
    expect(d.channel).toBe('EMAIL');
  });

  it('falls back to email when whatsapp is at its daily cap', () => {
    const d = resolveChannel(input({ counts: { whatsapp: 2, email: 0 } }));
    expect(d.channel).toBe('EMAIL');
    expect(d.cappedChannels).toContain('WHATSAPP');
  });

  it('defers to after quiet hours for non-critical sends', () => {
    // 22:00 IST is inside 21→8 quiet window.
    const d = resolveChannel(input({ now: new Date('2026-01-01T16:30:00Z') }));
    expect(d.channel).toBe('WHATSAPP');
    expect(d.sendNow).toBe(false);
    expect(d.deferUntil).not.toBeNull();
  });

  it('lets CRITICAL sends bypass quiet hours', () => {
    const d = resolveChannel(input({ now: new Date('2026-01-01T16:30:00Z'), priority: 'CRITICAL' }));
    expect(d.sendNow).toBe(true);
  });

  it('respects a forced channel when consented', () => {
    const d = resolveChannel(input({ forcedChannel: 'EMAIL' }));
    expect(d.order).toEqual(['EMAIL']);
    expect(d.channel).toBe('EMAIL');
  });
});
