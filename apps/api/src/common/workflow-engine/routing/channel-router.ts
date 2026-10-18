/**
 * Channel router (Plan §8 "Channel Router" + "Quiet Hours" + "Rate Limiting").
 * Pure composition of the four existing decision primitives into the single
 * dispatch decision the pipeline needs:
 *
 *   consent → candidate channels
 *          → engagement (preferred channel first)
 *          → rate-limit (first channel under its daily cap)
 *          → send-window (quiet-hours defer, unless CRITICAL)
 *
 * Keeping it pure means "why did we pick this channel at this time?" is fully
 * reconstructable for the decision log, and unit-testable without any I/O.
 */
import { EngagementSnapshot, preferredChannel } from '../engagement';
import { RateCaps, RateChannel, RateCounts, rateLimitDecision } from '../rate-limit';
import { resolveSendDecision, SendPriority, SendWindowConfig } from '../send-window';

export interface ChannelRouterInput {
  /** Per-channel consent (from toDunningConsent). */
  readonly consent: { readonly whatsapp: boolean; readonly email: boolean };
  /** Allow IN_APP (staff notifications) as a candidate/fallback. */
  readonly inAppAllowed?: boolean;
  /** Optional learned engagement, to bias channel order. */
  readonly engagement?: EngagementSnapshot;
  /** Optional policy/workflow-forced channel (still consent-gated). */
  readonly forcedChannel?: RateChannel;
  readonly counts: RateCounts;
  readonly caps: RateCaps;
  readonly now: Date;
  readonly sendWindow: SendWindowConfig;
  readonly priority: SendPriority;
}

export interface ChannelDecision {
  /** Chosen channel, or null when nothing is sendable (→ digest/hold). */
  readonly channel: RateChannel | null;
  readonly sendNow: boolean;
  readonly deferUntil: Date | null;
  /** The consent-filtered, engagement-ordered candidate list considered. */
  readonly order: readonly RateChannel[];
  readonly cappedChannels: readonly RateChannel[];
  readonly reason: string;
}

/** Default fallback order when engagement gives no signal. */
const DEFAULT_ORDER: readonly RateChannel[] = ['WHATSAPP', 'EMAIL', 'IN_APP'];

function candidates(input: ChannelRouterInput): RateChannel[] {
  const allowed = new Set<RateChannel>();
  if (input.consent.whatsapp) allowed.add('WHATSAPP');
  if (input.consent.email) allowed.add('EMAIL');
  if (input.inAppAllowed) allowed.add('IN_APP');

  // Engagement-preferred channel moves to the front (if still allowed).
  const preferred = input.engagement ? preferredChannel(input.engagement) : null;
  const ordered = DEFAULT_ORDER.filter((c) => allowed.has(c));
  if (preferred && allowed.has(preferred)) {
    return [preferred, ...ordered.filter((c) => c !== preferred)];
  }
  return ordered;
}

export function resolveChannel(input: ChannelRouterInput): ChannelDecision {
  // A forced channel short-circuits ordering but is still consent/cap gated.
  const order =
    input.forcedChannel && isAllowed(input.forcedChannel, input)
      ? [input.forcedChannel]
      : candidates(input);

  if (order.length === 0) {
    return {
      channel: null,
      sendNow: false,
      deferUntil: null,
      order,
      cappedChannels: [],
      reason: 'No consented/allowed channel for recipient.',
    };
  }

  const rate = rateLimitDecision({ channelOrder: order, counts: input.counts, caps: input.caps });
  if (!rate.channel) {
    return {
      channel: null,
      sendNow: false,
      deferUntil: null,
      order,
      cappedChannels: rate.cappedChannels,
      reason: rate.reason,
    };
  }

  // IN_APP is immediate; external channels respect quiet hours.
  if (rate.channel === 'IN_APP') {
    return {
      channel: 'IN_APP',
      sendNow: true,
      deferUntil: null,
      order,
      cappedChannels: rate.cappedChannels,
      reason: 'IN_APP delivered immediately.',
    };
  }

  const window = resolveSendDecision({ now: input.now, config: input.sendWindow, priority: input.priority });
  return {
    channel: rate.channel,
    sendNow: window.sendNow,
    deferUntil: window.deferUntil,
    order,
    cappedChannels: rate.cappedChannels,
    reason: `${rate.reason} ${window.reason}`.trim(),
  };
}

function isAllowed(channel: RateChannel, input: ChannelRouterInput): boolean {
  if (channel === 'WHATSAPP') return input.consent.whatsapp;
  if (channel === 'EMAIL') return input.consent.email;
  return input.inAppAllowed === true;
}
