import { BadRequestException } from '@nestjs/common';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Midnight UTC of the calendar day `ms` falls on. */
function utcDayStart(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/**
 * Reject document dates strictly in the future. Clients send their local
 * calendar date (parsed as 00:00 UTC), so "today" is any date that is already
 * today somewhere (up to UTC+14), regardless of the server's timezone. Used by
 * goods-receipts, goods-issues, damaged-stock, etc.
 */
export function assertNotFuture(date: Date, fieldName: string = 'Document date') {
  const latestToday = utcDayStart(Date.now() + 14 * HOUR_MS) + DAY_MS - 1;
  if (date.getTime() > latestToday) {
    throw new BadRequestException(`${fieldName} cannot be in the future`);
  }
}

/**
 * Reject dates that are not strictly in the future. Used by purchase-order
 * delivery-date validation: a PO's delivery date must be tomorrow or later.
 */
export function assertFuture(date: Date, fieldName: string = 'Date') {
  // Date-only values parse as 00:00 UTC, so compare against the next UTC day
  // rather than the server's local midnight.
  const tomorrowStart = utcDayStart(Date.now()) + DAY_MS;
  if (date.getTime() < tomorrowStart) {
    throw new BadRequestException(`${fieldName} must be in the future`);
  }
}
