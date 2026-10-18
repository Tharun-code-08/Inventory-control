/**
 * Customer consent state machine (Phase 2) — pure logic.
 *
 * Every outbound customer message (WhatsApp especially) is gated on an explicit
 * opt-in; inbound STOP/START keywords flip consent. This module holds the pure
 * rules; the (staging-gated) service persists `CustomerContactChannel.consentState`
 * and the WhatsApp webhook feeds inbound text through {@link parseConsentKeyword}.
 *
 * It also bridges consent → the dunning core: {@link toDunningConsent} turns a
 * customer's per-channel consent rows into the `CustomerConsent` flags that
 * `computeNextAction` consumes, so consent is enforced in one place.
 */
import { CustomerConsent } from './dunning';

export type ConsentState = 'PENDING' | 'OPTED_IN' | 'OPTED_OUT';
export type ConsentAction = 'OPT_IN' | 'OPT_OUT';
export type ConsentChannel = 'WHATSAPP' | 'EMAIL';

/** Inbound keywords that opt a customer OUT (case/space-insensitive). */
const STOP_WORDS: ReadonlySet<string> = new Set([
  'STOP',
  'UNSUBSCRIBE',
  'CANCEL',
  'QUIT',
  'END',
  'OPTOUT',
]);

/** Inbound keywords that opt a customer back IN. */
const START_WORDS: ReadonlySet<string> = new Set([
  'START',
  'YES',
  'SUBSCRIBE',
  'UNSTOP',
  'OPTIN',
]);

/**
 * Classify an inbound message as a consent action, or null if it isn't one.
 * Matches only when the whole message is the keyword (a reply of "yes" opts in;
 * "yes please send more" does not, to avoid false positives).
 */
export function parseConsentKeyword(text: string): ConsentAction | null {
  const t = text.trim().toUpperCase().replace(/\s+/g, '');
  if (STOP_WORDS.has(t)) return 'OPT_OUT';
  if (START_WORDS.has(t)) return 'OPT_IN';
  return null;
}

/** The target state for an action (opt-in/out are absolute, not toggles). */
export function reduceConsent(action: ConsentAction): ConsentState {
  return action === 'OPT_IN' ? 'OPTED_IN' : 'OPTED_OUT';
}

export interface ConsentTransition {
  readonly next: ConsentState;
  readonly changed: boolean;
  /** Set the consentAt timestamp only when the state actually changed. */
  readonly stampConsentAt: boolean;
}

/** Apply an action to the current state, reporting whether anything changed. */
export function applyConsentAction(
  current: ConsentState,
  action: ConsentAction,
): ConsentTransition {
  const next = reduceConsent(action);
  const changed = next !== current;
  return { next, changed, stampConsentAt: changed };
}

/** Outbound customer messaging is allowed only for an explicit opt-in. */
export function canMessageCustomer(state: ConsentState): boolean {
  return state === 'OPTED_IN';
}

export interface ChannelConsentRecord {
  readonly channel: ConsentChannel;
  readonly consentState: ConsentState;
}

/**
 * Fold a customer's per-channel consent rows into the `CustomerConsent` flags
 * the dunning core consumes. A channel counts as consented only when it is
 * OPTED_IN; missing rows default to not-consented.
 */
export function toDunningConsent(records: readonly ChannelConsentRecord[]): CustomerConsent {
  const optedIn = (channel: ConsentChannel): boolean =>
    records.some((r) => r.channel === channel && canMessageCustomer(r.consentState));
  return { whatsapp: optedIn('WHATSAPP'), email: optedIn('EMAIL') };
}
