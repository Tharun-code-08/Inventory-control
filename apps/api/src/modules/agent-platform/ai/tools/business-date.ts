/** Timezone the business runs in; drafts are dated by its calendar day. */
const BUSINESS_TZ = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';

/**
 * Today's date (YYYY-MM-DD) in the business timezone. `toISOString()` gives
 * the UTC date, which is yesterday in India until 05:30.
 */
export function businessToday(now: Date = new Date()): string {
  return businessDate(now);
}

/** A timestamp's calendar date (YYYY-MM-DD) in the business timezone. */
export function businessDate(at: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}
