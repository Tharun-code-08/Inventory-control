import { BadRequestException } from '@nestjs/common';

/**
 * Reject document dates strictly in the future. Today (until 23:59:59.999 in
 * the host timezone) is treated as valid. Used by goods-receipts, goods-issues,
 * damaged-stock, etc. to keep document dating sane without being timezone-pedantic.
 */
export function assertNotFuture(date: Date, fieldName: string = 'Document date') {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date.getTime() > today.getTime()) {
    throw new BadRequestException(`${fieldName} cannot be in the future`);
  }
}

/**
 * Reject dates that are not strictly in the future. Used by purchase-order
 * delivery-date validation: a PO's delivery date must be tomorrow or later.
 */
export function assertFuture(date: Date, fieldName: string = 'Date') {
  const tomorrowStart = new Date();
  tomorrowStart.setHours(0, 0, 0, 0);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  if (date.getTime() < tomorrowStart.getTime()) {
    throw new BadRequestException(`${fieldName} must be in the future`);
  }
}
