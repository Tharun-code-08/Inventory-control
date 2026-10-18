/**
 * Per-recipient rate-limit / fatigue cap (Phase 2 §7) — pure logic.
 *
 * Distinct from the HTTP ingress throttler (ThrottlerGuard): this caps *outbound*
 * messages per recipient per channel per rolling day, so a customer is never
 * spammed. The (staging-gated) dispatcher supplies the recipient's rolling
 * counts (from Redis/ledger) and the per-company caps; this module picks the
 * first channel still under its cap, walking the consent-filtered fallback order.
 *
 * IN_APP (staff) is never capped.
 */

export type RateChannel = 'WHATSAPP' | 'EMAIL' | 'IN_APP';

export interface RateCaps {
  /** Max WhatsApp messages per recipient per rolling day. Undefined = unlimited. */
  readonly whatsappPerDay?: number;
  /** Max emails per recipient per rolling day. Undefined = unlimited. */
  readonly emailPerDay?: number;
}

export interface RateCounts {
  readonly whatsapp: number;
  readonly email: number;
}

/** The cap for a channel, or null when unlimited. */
export function capFor(channel: RateChannel, caps: RateCaps): number | null {
  if (channel === 'WHATSAPP') return caps.whatsappPerDay ?? null;
  if (channel === 'EMAIL') return caps.emailPerDay ?? null;
  return null; // IN_APP unlimited
}

/** Messages already sent to the recipient on this channel in the window. */
export function countFor(channel: RateChannel, counts: RateCounts): number {
  if (channel === 'WHATSAPP') return counts.whatsapp;
  if (channel === 'EMAIL') return counts.email;
  return 0;
}

export function isUnderCap(channel: RateChannel, counts: RateCounts, caps: RateCaps): boolean {
  const cap = capFor(channel, caps);
  return cap === null || countFor(channel, counts) < cap;
}

/** First channel in the fallback order still under its cap, or null if all capped. */
export function firstAllowedChannel(
  order: readonly RateChannel[],
  counts: RateCounts,
  caps: RateCaps,
): RateChannel | null {
  return order.find((c) => isUnderCap(c, counts, caps)) ?? null;
}

export interface RateLimitDecision {
  /** The channel to send on, or null when every candidate is capped (→ digest). */
  readonly channel: RateChannel | null;
  /** Channels skipped because they were at cap. */
  readonly cappedChannels: RateChannel[];
  readonly reason: string;
}

/**
 * Resolve a send channel against per-recipient caps. Feeds off the same
 * consent-filtered fallback order the dunning core produces, so consent →
 * quiet-hours → rate-limit compose into one dispatch decision.
 */
export function rateLimitDecision(input: {
  channelOrder: readonly RateChannel[];
  counts: RateCounts;
  caps: RateCaps;
}): RateLimitDecision {
  const { channelOrder, counts, caps } = input;
  const cappedChannels = channelOrder.filter((c) => !isUnderCap(c, counts, caps));
  const channel = firstAllowedChannel(channelOrder, counts, caps);
  return {
    channel,
    cappedChannels,
    reason: channel
      ? `Sending via ${channel} (under daily cap).`
      : 'All candidate channels at daily cap; deferring to digest.',
  };
}
