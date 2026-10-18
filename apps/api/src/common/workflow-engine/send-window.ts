/**
 * Send-window / quiet-hours core (Phase 3) — pure, timezone-aware.
 *
 * There is no `Company.timezone` column (deliberately skipped), so the caller
 * passes a business UTC offset in minutes (e.g. IST = 330) alongside quiet-hour
 * bounds. This module decides whether an outbound message may go now or must be
 * deferred to the next permissible instant. All times in/out are UTC `Date`s;
 * "local" means business-local wall clock derived from the offset.
 *
 * No I/O — the dispatcher calls {@link resolveSendDecision} and, on defer, delays
 * the BullMQ job until `deferUntil`.
 */

export type SendPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface SendWindowConfig {
  /** Business timezone as a UTC offset in minutes (IST = 330). */
  readonly businessUtcOffsetMinutes: number;
  /** Quiet window start hour, business-local [0..23]. */
  readonly quietStartHour: number;
  /** Quiet window end hour, business-local [0..23]. Equal to start = no quiet window. */
  readonly quietEndHour: number;
  /** Optional soft nudge — the hour non-urgent sends prefer (business-local). */
  readonly preferredSendHour?: number;
}

export interface SendDecision {
  readonly sendNow: boolean;
  /** UTC instant to retry at when deferred; null when sending now. */
  readonly deferUntil: Date | null;
  readonly reason: string;
}

const MIN_MS = 60_000;

/** Is `hour` inside the quiet window? Handles windows that wrap midnight (22→8). */
export function isQuietHour(hour: number, startHour: number, endHour: number): boolean {
  if (startHour === endHour) return false; // no quiet window configured
  if (startHour < endHour) return hour >= startHour && hour < endHour; // same-day
  return hour >= startHour || hour < endHour; // wraps midnight
}

/** The business-local wall clock as a UTC-shifted Date (read its UTC fields as local). */
function toLocal(now: Date, offsetMinutes: number): Date {
  return new Date(now.getTime() + offsetMinutes * MIN_MS);
}

/** The next business-local instant at `hour:00`, strictly after `local`. */
function nextLocalAtHour(local: Date, hour: number): Date {
  const d = new Date(local.getTime());
  d.setUTCHours(hour, 0, 0, 0);
  if (d.getTime() <= local.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** Convert a business-local (UTC-shifted) Date back to a real UTC instant. */
function localToUtc(local: Date, offsetMinutes: number): Date {
  return new Date(local.getTime() - offsetMinutes * MIN_MS);
}

/**
 * Decide whether to send now or defer. CRITICAL priority bypasses quiet hours
 * (e.g. security/final escalations); everything else defers to the next
 * quiet-window end.
 */
export function resolveSendDecision(input: {
  now: Date;
  config: SendWindowConfig;
  priority: SendPriority;
}): SendDecision {
  const { now, config, priority } = input;
  const local = toLocal(now, config.businessUtcOffsetMinutes);
  const hour = local.getUTCHours();

  if (isQuietHour(hour, config.quietStartHour, config.quietEndHour)) {
    if (priority === 'CRITICAL') {
      return { sendNow: true, deferUntil: null, reason: 'Critical priority bypasses quiet hours.' };
    }
    const deferLocal = nextLocalAtHour(local, config.quietEndHour);
    return {
      sendNow: false,
      deferUntil: localToUtc(deferLocal, config.businessUtcOffsetMinutes),
      reason: `Quiet hours; deferred to ${config.quietEndHour}:00 local.`,
    };
  }

  return { sendNow: true, deferUntil: null, reason: 'Within send window.' };
}

/**
 * The next business-local `preferredSendHour` as a UTC instant — an opt-in helper
 * for non-urgent sends (digests). Returns null when no preferred hour is set.
 */
export function nextPreferredSendTime(now: Date, config: SendWindowConfig): Date | null {
  if (config.preferredSendHour === undefined) return null;
  const local = toLocal(now, config.businessUtcOffsetMinutes);
  const target = nextLocalAtHour(local, config.preferredSendHour);
  return localToUtc(target, config.businessUtcOffsetMinutes);
}
